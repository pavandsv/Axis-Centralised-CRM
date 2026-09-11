import { useMemo, useState } from 'react'
import {
  AlertTriangle, ArrowRight, CheckCircle2, CopyCheck, MapPinOff, Route, UserPlus, Zap,
} from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls, selectCls, selectStyle } from './Modal'
import { CAMPAIGNS, USERS, formatINR, resolvePincode } from '../../data/crm'
import { LEAD_SOURCES, OCCUPATIONS, OCCUPATION_EMPLOYMENT, PORTFOLIOS, PRODUCTS } from '../../data/masters'
import { createLead } from '../../logic/leadStore'
import { ORDINAL_MAROON } from '../../theme/chartTheme'

/** Mandatory fields per the Lead Module sheet. */
const REQUIRED = ['firstName', 'lastName', 'leadSource', 'mobileNumber', 'pincode', 'portfolio', 'product', 'occupation']

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-3 border-b border-af-border/40 py-1.5 last:border-0">
    <span className="flex-shrink-0 text-[11px] text-slate-400">{label}</span>
    <span className={`text-right text-[11px] font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
)

export default function CreateLeadModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', leadSource: 'Website',
    campaignId: '', campaignName: '',
    mobileNumber: '', alternateMobile: '', emailId: '', dateOfBirth: '', ucic: '', panNumber: '',
    pincode: '', portfolio: PORTFOLIOS[0], product: '', productCode: '',
    offerAmount: '', occupation: OCCUPATIONS[0], employmentType: OCCUPATION_EMPLOYMENT[OCCUPATIONS[0]],
  })
  const [errors, setErrors] = useState({})
  const [result, setResult] = useState(null)

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const geo = useMemo(() => (form.pincode.length === 6 ? resolvePincode(form.pincode) : null), [form.pincode])
  const productsInPortfolio = useMemo(() => PRODUCTS.filter((p) => p.portfolio === form.portfolio), [form.portfolio])
  const activeCampaigns = useMemo(
    () => CAMPAIGNS.filter((c) => (form.product ? c.products.includes(form.product) : true)).slice(0, 30),
    [form.product],
  )

  const validate = () => {
    const e = {}
    for (const k of REQUIRED) if (!form[k]) e[k] = 'Required'
    if (form.mobileNumber && !/^[6-9]\d{9}$/.test(form.mobileNumber)) e.mobileNumber = '10 digits, starting 6–9'
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) e.pincode = '6 digits'
    if (form.emailId && !/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(form.emailId)) e.emailId = 'Invalid email'
    if (form.ucic && !/^\d{6,12}$/.test(form.ucic)) e.ucic = '6–12 digits'
    return e
  }

  const submit = () => {
    const e = validate()
    setErrors(e)
    if (Object.keys(e).length) return
    const product = PRODUCTS.find((p) => p.name === form.product)
    const campaign = CAMPAIGNS.find((c) => c.campaignId === form.campaignId) || activeCampaigns[0]
    const outcome = createLead(
      {
        ...form,
        productCode: product?.code,
        campaignId: campaign?.campaignId || 'CMP-MANUAL',
        campaignName: campaign?.campaignName || 'Manual entry',
        employmentType: OCCUPATION_EMPLOYMENT[form.occupation],
      },
      USERS,
      currentUser,
    )
    setResult(outcome)
    onCreated?.(outcome)
  }

  const err = (k) => errors[k] && <p className="mt-1 text-[10px] font-medium text-red-600">{errors[k]}</p>

  // ---------------------------------------------------------------- result view
  if (result) {
    const { lead, decision, duplicate, tasks, owner } = result
    const parked = decision.outcome !== 'assigned'
    return (
      <Modal title="Lead created" icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" onClose={onClose}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="font-mono text-sm font-bold text-emerald-800">{lead.leadId}</p>
            <p className="mt-0.5 text-xs text-emerald-700">
              {lead.firstName} {lead.lastName} · {lead.product} · {formatINR(lead.offerAmount)}
            </p>
          </div>

          {/* 1. de-duplication */}
          <div className={`rounded-2xl border p-3.5 ${duplicate.isDuplicate ? 'border-amber-200 bg-amber-50' : 'border-af-border bg-af-bg'}`}>
            <div className="flex items-center gap-2">
              <CopyCheck size={14} className={duplicate.isDuplicate ? 'text-amber-600' : 'text-slate-400'} />
              <p className="text-xs font-semibold text-gray-800">Duplicate check</p>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              {duplicate.isDuplicate
                ? `Flagged as duplicate of ${duplicate.matchedLeadId} — ${duplicate.reason}`
                : duplicate.reason || 'No match on campaign + product + LAN + expiry'}
            </p>
          </div>

          {/* 2. routing */}
          <div className="rounded-2xl border border-[#861D3F]/15 bg-[#FDF0F4] p-3.5">
            <div className="flex items-center gap-2">
              {parked ? <MapPinOff size={14} className="text-[#861D3F]" /> : <Route size={14} className="text-[#861D3F]" />}
              <p className="text-xs font-semibold text-[#861D3F]">
                Rule {decision.ruleNo} — {decision.ruleName}
              </p>
            </div>
            <div className="mt-2">
              <Row label="Outcome" value={decision.outcome} />
              <Row label={parked ? 'Parked with' : 'Assigned to'} value={owner?.name || decision.parkedWith || '—'} />
              {owner && <Row label="Branch" value={owner.branch || owner.team} />}
              <Row label="Selection" value={decision.strategy || decision.reason} />
              {decision.poolSize > 1 && <Row label="Eligible pool" value={`${decision.poolSize} users`} />}
            </div>
            {decision.trace?.length > 0 && (
              <div className="mt-2 space-y-0.5 border-t border-[#861D3F]/10 pt-2">
                {decision.trace.map((t, i) => (
                  <p key={i} className="text-[10px] leading-relaxed text-[#861D3F]/70">
                    <span className="font-semibold">Rule {t.ruleNo}</span> {t.matched ? '✓' : '·'} {t.text}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* 3. automation + notification */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-af-border bg-af-bg p-3.5">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-[#861D3F]" />
                <p className="text-xs font-semibold text-gray-800">Auto task raised</p>
              </div>
              {tasks.length ? tasks.map((t) => (
                <p key={t.taskId} className="mt-1 text-[11px] text-slate-500">
                  <span className="font-mono">{t.taskId}</span> · {t.title} · due {t.dueDate}
                </p>
              )) : <p className="mt-1 text-[11px] text-slate-400">None — lead is unallocated</p>}
            </div>
            <div className="rounded-2xl border border-af-border bg-af-bg p-3.5">
              <div className="flex items-center gap-2">
                <AlertTriangle size={13} className="text-[#861D3F]" />
                <p className="text-xs font-semibold text-gray-800">Trigger 1 fired</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                {owner ? `${owner.name} notified — in-app + email, immediately` : 'No assignee to notify'}
              </p>
            </div>
          </div>

          <p className="text-[10px] leading-relaxed text-slate-400">
            Every screen now reflects this lead — dashboard widgets, the lead list, tasks and the audit trail.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <CancelButton onClick={onClose} label="Close" />
          <button
            onClick={() => { setResult(null); setForm((f) => ({ ...f, firstName: '', lastName: '', mobileNumber: '', ucic: '' })) }}
            className="flex-1 rounded-xl bg-[#861D3F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A42B55]"
          >
            Create another
          </button>
        </div>
      </Modal>
    )
  }

  // ------------------------------------------------------------------ form view
  return (
    <Modal title="Create Lead" icon={UserPlus} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Lead first name *</label>
            <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} placeholder="e.g. Ananya" />
            {err('firstName')}
          </div>
          <div>
            <label className={labelCls}>Lead last name *</label>
            <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} placeholder="e.g. Deshpande" />
            {err('lastName')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Mobile Number *</label>
            <input className={inputCls} maxLength={10} value={form.mobileNumber} onChange={(e) => set('mobileNumber', e.target.value.replace(/\D/g, ''))} placeholder="10 digits" />
            {err('mobileNumber')}
          </div>
          <div>
            <label className={labelCls}>Email ID</label>
            <input className={inputCls} value={form.emailId} onChange={(e) => set('emailId', e.target.value)} placeholder="name@example.com" />
            {err('emailId')}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Lead Source *</label>
            <select className={selectCls} style={selectStyle} value={form.leadSource} onChange={(e) => set('leadSource', e.target.value)}>
              {LEAD_SOURCES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Occupation *</label>
            <select className={selectCls} style={selectStyle} value={form.occupation} onChange={(e) => set('occupation', e.target.value)}>
              {OCCUPATIONS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Portfolio *</label>
            <select
              className={selectCls}
              style={selectStyle}
              value={form.portfolio}
              onChange={(e) => { set('portfolio', e.target.value); set('product', '') }}
            >
              {PORTFOLIOS.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Product *</label>
            <select className={selectCls} style={selectStyle} value={form.product} onChange={(e) => set('product', e.target.value)}>
              <option value="">— Select —</option>
              {productsInPortfolio.map((p) => <option key={p.name} value={p.name}>{p.name}</option>)}
            </select>
            {err('product')}
          </div>
        </div>

        <div>
          <label className={labelCls}>Pincode * — this is what routes the lead</label>
          <input className={inputCls} maxLength={6} value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} placeholder="e.g. 400051" />
          {err('pincode')}
          {form.pincode.length === 6 && (
            <div className={`mt-2 rounded-xl border px-3 py-2 ${geo?.branch ? 'border-af-border bg-af-bg' : 'border-amber-200 bg-amber-50'}`}>
              {geo?.branch ? (
                <p className="text-[11px] text-slate-600">
                  <span className="font-semibold">{geo.city}, {geo.state}</span> · {geo.branch} · {geo.region} · {geo.zone}
                </p>
              ) : (
                <p className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
                  <MapPinOff size={11} /> Not in the Territory Master — this will route as an out-of-geography lead (rule 3)
                </p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Offer Amount</label>
            <input className={inputCls} value={form.offerAmount} onChange={(e) => set('offerAmount', e.target.value.replace(/[^\d]/g, ''))} placeholder="e.g. 500000" />
          </div>
          <div>
            <label className={labelCls}>UCIC — existing customer</label>
            <input className={inputCls} value={form.ucic} onChange={(e) => set('ucic', e.target.value.replace(/\D/g, ''))} placeholder="optional" />
            {err('ucic')}
          </div>
        </div>

        <div>
          <label className={labelCls}>Campaign</label>
          <select className={selectCls} style={selectStyle} value={form.campaignId} onChange={(e) => set('campaignId', e.target.value)}>
            <option value="">— Manual entry —</option>
            {activeCampaigns.map((c) => (
              <option key={c.campaignId} value={c.campaignId}>{c.campaignName} · {c.campaignId}</option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-af-border bg-af-bg px-3 py-2.5">
          <p className="text-[10px] leading-relaxed text-slate-500">
            On save the lead is de-duplicated, routed by the live assignment rules, given its
            auto-task and its assignee notified — you will see exactly which rule fired and why.
          </p>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <CancelButton onClick={onClose} />
        <button onClick={submit} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#861D3F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A42B55]">
          Create &amp; route <ArrowRight size={14} />
        </button>
      </div>
    </Modal>
  )
}

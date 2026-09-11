import { useMemo, useState } from 'react'
import { CheckCircle2, Info, PencilLine, Zap } from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls, selectCls, selectStyle } from './Modal'
import { USERS } from '../../data/crm'
import { LEAD_STATUSES, REASONS } from '../../data/masters'
import { changeLeadStatus } from '../../logic/leadStore'
import { StatusBadge } from '../Badges'

/**
 * Status change — the action a DST performs all day.
 *
 * The mandatory rules come from the Lead Module sheet: a reason code is required
 * for Rejected and Not interested; a next follow-up date is required for
 * Follow-up, which also raises the follow-up task (automation 2).
 */
export default function UpdateLeadModal({ lead, currentUser, onClose, onDone }) {
  const [status, setStatus] = useState(lead.leadStatus)
  const [reasonCode, setReasonCode] = useState(lead.reasonCode || '')
  const [nextFollowUpDate, setNextFollowUpDate] = useState(lead.nextFollowUpDate || '')
  const [remark, setRemark] = useState('')
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(null)

  const reasonsFor = useMemo(() => REASONS.filter((r) => r.appliesTo.includes(status)), [status])
  const reasonRequired = ['Rejected', 'Not interested'].includes(status)
  const dateRequired = status === 'Follow-up'

  const submit = () => {
    const res = changeLeadStatus(
      lead.leadId,
      { status, reasonCode, reason: REASONS.find((r) => r.code === reasonCode)?.label, nextFollowUpDate, remark },
      USERS,
      currentUser,
    )
    if (Object.keys(res.errors || {}).length) { setErrors(res.errors); return }
    setDone(res)
    onDone?.(res)
  }

  const err = (k) => errors[k] && <p className="mt-1 text-[10px] font-medium text-red-600">{errors[k]}</p>

  if (done) {
    return (
      <Modal title="Lead updated" icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" onClose={onClose}>
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
            <StatusBadge status={done.lead.leadStatus} />
            <p className="text-xs text-emerald-800">{done.lead.leadId} · {done.lead.firstName} {done.lead.lastName}</p>
          </div>
          {done.task && (
            <div className="rounded-2xl border border-af-border bg-af-bg p-3.5">
              <div className="flex items-center gap-2">
                <Zap size={13} className="text-[#861D3F]" />
                <p className="text-xs font-semibold text-gray-800">Automation 2 fired</p>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                <span className="font-mono">{done.task.taskId}</span> · {done.task.title} · due {done.task.dueDate} · {done.task.assignedToName}
              </p>
            </div>
          )}
          <p className="text-[10px] leading-relaxed text-slate-400">
            The change is on the lead's timeline and in the audit trail, and every screen has recomputed.
          </p>
        </div>
        <div className="mt-6 flex gap-3">
          <CancelButton onClick={onClose} label="Close" />
        </div>
      </Modal>
    )
  }

  return (
    <Modal title="Update lead status" icon={PencilLine} onClose={onClose}>
      <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-af-border bg-af-bg px-3.5 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-800">{lead.firstName} {lead.lastName}</p>
          <p className="text-[11px] text-slate-500">{lead.product} · {lead.assignedToName || 'unallocated'}</p>
        </div>
        <StatusBadge status={lead.leadStatus} />
      </div>

      <div className="space-y-4">
        <div>
          <label className={labelCls}>New status *</label>
          <select className={selectCls} style={selectStyle} value={status} onChange={(e) => { setStatus(e.target.value); setReasonCode('') }}>
            {LEAD_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
          {err('status')}
        </div>

        {reasonsFor.length > 0 && (
          <div>
            <label className={labelCls}>
              Reason {reasonRequired ? '* — mandatory for this status' : '(optional)'}
            </label>
            <select className={selectCls} style={selectStyle} value={reasonCode} onChange={(e) => setReasonCode(e.target.value)}>
              <option value="">— Select —</option>
              {reasonsFor.map((r) => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
            </select>
            {err('reasonCode')}
          </div>
        )}

        {dateRequired && (
          <div>
            <label className={labelCls}>Next follow-up date * — also raises the follow-up task</label>
            <input type="date" className={inputCls} value={nextFollowUpDate} onChange={(e) => setNextFollowUpDate(e.target.value)} />
            {err('nextFollowUpDate')}
          </div>
        )}

        <div>
          <label className={labelCls}>Remark</label>
          <textarea className={inputCls} rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="What the customer said…" />
        </div>

        {status === 'Follow-up' && (
          <div className="flex items-start gap-2 rounded-xl border border-af-border bg-af-bg px-3 py-2.5">
            <Info size={12} className="mt-0.5 flex-shrink-0 text-slate-400" />
            <p className="text-[10px] leading-relaxed text-slate-500">
              Moving a lead into Follow-up raises a follow-up call task automatically — one of the two
              automations on the Task Fields sheet.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <CancelButton onClick={onClose} />
        <button onClick={submit} className="flex-1 rounded-xl bg-[#861D3F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A42B55]">
          Save update
        </button>
      </div>
    </Modal>
  )
}

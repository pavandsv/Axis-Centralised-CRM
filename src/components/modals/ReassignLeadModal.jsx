import { useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeftRight, CheckCircle2, CircleUserRound, Trash2 } from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls } from './Modal'
import { USERS } from '../../data/crm'
import { deleteLead, reassignLead } from '../../logic/leadStore'
import { ASSIGNMENT_RULES } from '../../config/assignmentRules'

/**
 * Re-assignment. The Input Sheet's "who can re-assign later" column lists SM and
 * above for geography rules, ZH and Vertical Head for out-of-geography, so the
 * caller gates on the matrix and this modal shows who is eligible to receive it.
 */
export function ReassignLeadModal({ lead, currentUser, onClose, onDone }) {
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')

  const rule = ASSIGNMENT_RULES.find((r) => r.no === lead.assignmentRuleNo)

  const { suggested, others } = useMemo(() => {
    const active = USERS.filter((u) => u.role === 'DST' && u.status !== 'Inactive')
    const atBranch = active.filter((u) => u.branchCode === lead.branchCode)
    // A manager may take the lead themselves — the sheet has the Zonal Head
    // handling out-of-geography leads directly, so they must be selectable.
    const self = currentUser && currentUser.role !== 'DST' ? [{ ...currentUser, isSelf: true }] : []
    return {
      suggested: [...self, ...atBranch],
      others: active.filter((u) => u.branchCode !== lead.branchCode).slice(0, 60),
    }
  }, [lead.branchCode, currentUser])

  const submit = () => {
    if (!selected) return
    const res = reassignLead(lead.leadId, selected, USERS, currentUser, note)
    if (res) onDone?.(res)
    onClose()
  }

  return (
    <Modal title="Re-assign lead" icon={ArrowLeftRight} onClose={onClose}>
      <div className="mb-4 rounded-xl border border-af-border bg-af-bg px-3.5 py-3">
        <p className="text-sm font-semibold text-gray-800">{lead.firstName} {lead.lastName}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {lead.product} · {lead.branch || 'unmapped pincode'} · currently {lead.assignedToName || 'unallocated'}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          Placed by rule {lead.assignmentRuleNo} — {lead.assignmentRuleName}
          {rule ? `. Re-assignment allowed for: ${rule.whoCanReassign.join(', ')}` : ''}
        </p>
      </div>

      {suggested.length > 0 && (
        <>
          <p className={labelCls}>Take it yourself, or hand it to the branch</p>
          <div className="mb-3 space-y-1.5">
            {suggested.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelected(u.id)}
                className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                  selected === u.id ? 'border-[#861D3F] bg-[#FDF0F4]' : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#861D3F]">
                  <CircleUserRound size={16} className="text-white" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${selected === u.id ? 'text-[#861D3F]' : 'text-gray-800'}`}>{u.name}</p>
                  <p className="truncate text-xs text-slate-400">
                    {u.isSelf ? `Assign to me · ${u.role}` : `${u.team || u.branch} · ${u.city}`}
                  </p>
                </div>
                {u.id === lead.assignedTo && <span className="flex-shrink-0 text-[10px] font-semibold text-slate-400">current</span>}
                {selected === u.id && <CheckCircle2 size={15} className="flex-shrink-0 text-[#861D3F]" />}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="mb-4">
        <label className={labelCls}>Anyone else</label>
        <select className={inputCls + ' pr-10'} value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">— Select a user —</option>
          {others.map((u) => (
            <option key={u.id} value={u.id}>{u.name} · {u.branch || u.team} · {u.city}</option>
          ))}
        </select>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Reason — recorded in the audit trail</label>
        <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. owner on leave, territory correction" />
      </div>

      <div className="flex gap-3">
        <CancelButton onClick={onClose} />
        <button
          onClick={submit}
          disabled={!selected || selected === lead.assignedTo}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            selected && selected !== lead.assignedTo ? 'bg-[#861D3F] text-white hover:bg-[#A42B55]' : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Re-assign
        </button>
      </div>
    </Modal>
  )
}

/** Delete is restricted to Product Team, HO and Super User by the matrix. */
export function DeleteLeadModal({ lead, currentUser, onClose, onDone }) {
  const [reason, setReason] = useState('')
  return (
    <Modal title="Delete lead" icon={Trash2} iconBg="bg-red-50" iconColor="text-red-600" onClose={onClose}>
      <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3">
        <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-800">
            Delete {lead.firstName} {lead.lastName} ({lead.leadId})?
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-red-700">
            The lead leaves every working view immediately. The audit trail keeps the full history —
            deletion is recorded, never erased.
          </p>
        </div>
      </div>
      <div className="mb-5">
        <label className={labelCls}>Reason * — recorded in the audit trail</label>
        <input className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. test record, customer withdrawal request" />
      </div>
      <div className="flex gap-3">
        <CancelButton onClick={onClose} />
        <button
          onClick={() => {
            if (!reason.trim()) return
            const res = deleteLead(lead.leadId, currentUser, reason)
            onDone?.(res)
            onClose()
          }}
          disabled={!reason.trim()}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
            reason.trim() ? 'bg-red-600 text-white hover:bg-red-700' : 'cursor-not-allowed bg-slate-100 text-slate-300'
          }`}
        >
          Delete lead
        </button>
      </div>
    </Modal>
  )
}

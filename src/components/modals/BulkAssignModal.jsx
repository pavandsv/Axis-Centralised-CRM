import { useMemo, useState } from 'react'
import { CheckCircle2, CircleUserRound, Users } from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls } from './Modal'
import { USERS } from '../../data/crm'
import { reassignLead } from '../../logic/leadStore'

/**
 * Mass assign — MOM 8 Sep: "Add mass multi-select assign alongside the existing
 * single-row Assign" on Unallocated Leads.
 *
 * Every lead goes through reassignLead(), the same path the single-row Assign
 * uses, so the audit trail records one entry per lead rather than one vague
 * "bulk" event that hides which records moved.
 */
export default function BulkAssignModal({ leads, currentUser, onClose, onDone }) {
  const [selected, setSelected] = useState('')
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')

  // The selection can span branches, so the whole active DST list is offered,
  // with the branches actually represented called out first.
  const branches = useMemo(
    () => [...new Set(leads.map((l) => l.branchCode).filter(Boolean))],
    [leads],
  )

  const { suggested, others } = useMemo(() => {
    const active = USERS.filter((u) => u.role === 'DST' && u.status !== 'Inactive')
    const self = currentUser && currentUser.role !== 'DST' ? [{ ...currentUser, isSelf: true }] : []
    const q = query.trim().toLowerCase()
    const match = (u) => !q || u.name.toLowerCase().includes(q) || (u.branch || '').toLowerCase().includes(q)
    return {
      suggested: [...self, ...active.filter((u) => branches.includes(u.branchCode))].filter(match),
      others: active.filter((u) => !branches.includes(u.branchCode)).filter(match).slice(0, 60),
    }
  }, [branches, currentUser, query])

  const submit = () => {
    if (!selected) return
    const done = leads
      .map((l) => reassignLead(l.leadId, selected, USERS, currentUser, note || 'Mass assignment'))
      .filter(Boolean)
    onDone?.({ count: done.length, toName: USERS.find((u) => u.id === selected)?.name || selected })
    onClose()
  }

  const Option = ({ u }) => (
    <button
      key={u.id}
      type="button"
      onClick={() => setSelected(u.id)}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition-colors ${
        selected === u.id ? 'bg-[#FDF0F4] ring-1 ring-[#861D3F]/25' : 'hover:bg-af-bg'
      }`}
    >
      <CircleUserRound size={16} className={selected === u.id ? 'text-[#861D3F]' : 'text-slate-300'} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs font-semibold text-gray-800">
          {u.name}
          {u.isSelf && <span className="ml-1 text-[10px] font-normal text-slate-400">(you)</span>}
        </span>
        <span className="block truncate text-[10px] text-slate-400">{u.branch || u.city} · {u.role}</span>
      </span>
      {selected === u.id && <CheckCircle2 size={14} className="flex-shrink-0 text-[#861D3F]" />}
    </button>
  )

  return (
    <Modal title={`Assign ${leads.length} lead${leads.length === 1 ? '' : 's'}`} icon={Users} onClose={onClose}>
      <div className="mb-4 rounded-xl border border-af-border bg-af-bg px-3.5 py-3">
        <p className="text-sm font-semibold text-gray-800">
          {leads.length} unallocated lead{leads.length === 1 ? '' : 's'} selected
        </p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {branches.length ? `${branches.length} branch${branches.length === 1 ? '' : 'es'}` : 'unmapped pincodes'}
          {' · '}
          Each lead is assigned individually and logged individually.
        </p>
      </div>

      <label className={labelCls}>Find a DST</label>
      <input
        className={inputCls}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Name or branch"
      />

      <div className="mt-3 max-h-60 overflow-y-auto rounded-xl border border-af-border p-1">
        {suggested.length > 0 && (
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Covering these branches
          </p>
        )}
        {suggested.map((u) => <Option key={u.id} u={u} />)}
        {others.length > 0 && (
          <p className="px-3 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Other branches
          </p>
        )}
        {others.map((u) => <Option key={u.id} u={u} />)}
        {!suggested.length && !others.length && (
          <p className="px-3 py-6 text-center text-xs text-slate-400">No one matches that search</p>
        )}
      </div>

      <label className={`${labelCls} mt-3`}>Note (recorded on every lead)</label>
      <input
        className={inputCls}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Why these leads are moving"
      />

      <div className="mt-5 flex justify-end gap-2">
        <CancelButton onClick={onClose} />
        <button
          type="button"
          onClick={submit}
          disabled={!selected}
          className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          Assign {leads.length} lead{leads.length === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  )
}

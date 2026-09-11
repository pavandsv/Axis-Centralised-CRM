import { useMemo, useState } from 'react'
import {
  CalendarCheck, CheckCircle2, ChevronDown, ChevronUp, Clock, FileText,
  Phone, Plus, Search, Users, X, Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { TODAY, formatINR, scopedTasks, taskSummary } from '../data/crm'
import {
  CALL_CONNECTED, NEXT_ACTIONS, TASK_AUTOMATIONS, TASK_FIELDS, TASK_PRIORITIES,
  TASK_STATUSES, TASK_TYPES, isRequired, validateTask,
} from '../config/taskFields'
import { can } from '../config/roles'
import { scopeDescription } from '../logic/visibility'
import { auditEvents } from '../logic/auditTrail'
import { ProductBadge, StatusBadge } from '../components/Badges'
import Modal, { CancelButton, inputCls, labelCls, selectCls, selectStyle } from '../components/modals/Modal'
import { ORDINAL_MAROON, STATUS, ordinalSteps } from '../theme/chartTheme'

const TYPE_ICON = { Call: Phone, Meeting: Users, 'Document Collection': FileText }

const STATUS_STYLE = {
  Open: 'bg-[#FDF0F4] text-[#861D3F] border-[#861D3F]/20',
  'In Progress': 'bg-amber-50 text-amber-700 border-amber-200',
  Completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
}
const PRIORITY_STYLE = {
  High: 'bg-red-50 text-red-700 border-red-200',
  Medium: 'bg-amber-50 text-amber-700 border-amber-200',
  Low: 'bg-slate-50 text-slate-600 border-slate-200',
}

function TaskRow({ task, expanded, onToggleExpand, onComplete, canEdit }) {
  const Icon = TYPE_ICON[task.taskType] || Phone
  const done = task.status === 'Completed'

  return (
    <div className={`card overflow-hidden transition-all duration-150 ${task.overdue ? 'border-red-200' : ''}`}>
      <div className="flex items-start gap-4 px-5 py-4">
        <button
          onClick={() => canEdit && !done && onComplete(task)}
          disabled={!canEdit || done}
          aria-label={done ? 'Completed' : 'Mark complete'}
          className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all duration-150
            ${done ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 hover:border-[#861D3F] disabled:hover:border-slate-300'}`}
        >
          {done && <CheckCircle2 size={11} className="text-white" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <p className={`text-sm font-semibold ${done ? 'text-slate-400 line-through' : 'text-gray-800'}`}>{task.title}</p>
            <span className="flex items-center gap-1 rounded-full border border-af-border bg-af-bg px-2 py-0.5 text-[10px] font-semibold text-slate-600">
              <Icon size={9} /> {task.taskType}
            </span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[task.status]}`}>{task.status}</span>
            {task.automation && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500" title="Created automatically">
                <Zap size={9} /> auto
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            {task.customerName} · <span className="font-mono text-slate-400">{task.leadId}</span>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <ProductBadge product={task.product} />
            <span className="text-xs text-slate-400">{formatINR(task.offerAmount)}</span>
            <span className={`text-xs font-medium ${task.overdue ? 'text-red-600' : 'text-slate-400'}`}>
              {task.overdue ? 'Overdue · ' : 'Due · '}
              {task.dueDate} {task.dueTime}
            </span>
            <span className="text-xs text-slate-400">Owner · {task.assignedToName}</span>
          </div>
        </div>

        <button
          onClick={() => onToggleExpand(task.taskId)}
          aria-label="Show all fields"
          className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-all hover:bg-slate-50 hover:text-gray-700"
        >
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {expanded && (
        <div className="animate-fade-in border-t border-af-border bg-af-bg px-5 py-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            All 17 task fields
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {TASK_FIELDS.map((f) => {
              const raw =
                f.key === 'createdBy' ? `${task.createdBy} · ${String(task.createdOn).slice(0, 10)}`
                : f.key === 'taskId' ? task.taskId
                : task[f.key]
              const required = isRequired(f, task)
              return (
                <div key={f.key} className="flex items-baseline justify-between gap-2 border-b border-af-border/50 py-1">
                  <span className="flex-shrink-0 text-[11px] text-slate-400">
                    {f.no}. {f.label}
                    {required && <span className="text-red-500"> *</span>}
                  </span>
                  <span className="truncate text-right text-[11px] font-medium text-gray-700">
                    {raw === null || raw === undefined || raw === '' ? <span className="text-slate-300">—</span> : String(raw)}
                  </span>
                </div>
              )
            })}
          </div>
          {task.automation && (
            <p className="mt-3 rounded-lg border border-af-border bg-white px-2.5 py-1.5 text-[10px] text-slate-500">
              Auto-created by the “{TASK_AUTOMATIONS.find((a) => a.key === task.automation)?.when}” automation.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function CreateTaskModal({ leads, team, currentUser, onClose, onSave, onAudit }) {
  const [form, setForm] = useState({
    taskType: 'Call',
    priority: 'Medium',
    title: '',
    leadId: '',
    customerName: '',
    dueDate: TODAY,
    dueTime: '10:00',
    assignedTo: currentUser.id,
    status: 'Open',
    outcome: '',
    callConnected: '',
    nextAction: '',
    nextFollowUpDate: '',
    leadStillOpen: true,
  })
  const [errors, setErrors] = useState({})
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const submit = () => {
    const e = validateTask(form)
    setErrors(e)
    if (Object.keys(e).length) return
    onSave(form)
    onAudit?.({ ...form, taskId: 'pending' })
    onClose()
  }

  const err = (key) => errors[key] && <p className="mt-1 text-[10px] font-medium text-red-600">{errors[key]}</p>

  return (
    <Modal title="Create Task" icon={CalendarCheck} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Task Type *</label>
            <select className={selectCls} style={selectStyle} value={form.taskType} onChange={(e) => set('taskType', e.target.value)}>
              {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority *</label>
            <select className={selectCls} style={selectStyle} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
              {TASK_PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>Task Title / Subject *</label>
          <input className={inputCls} placeholder="e.g. Collect income documents" value={form.title} onChange={(e) => set('title', e.target.value)} />
          {err('title')}
        </div>

        <div>
          <label className={labelCls}>Linked Lead ID * — every task must sit under a lead</label>
          <select
            className={selectCls}
            style={selectStyle}
            value={form.leadId}
            onChange={(e) => {
              const lead = leads.find((l) => l.leadId === e.target.value)
              set('leadId', e.target.value)
              if (lead) {
                setForm((f) => ({ ...f, customerName: `${lead.firstName} ${lead.lastName}`, leadId: lead.leadId }))
              }
            }}
          >
            <option value="">— Select a lead —</option>
            {leads.slice(0, 200).map((l) => (
              <option key={l.leadId} value={l.leadId}>
                {l.firstName} {l.lastName} · {l.product} · {l.leadId}
              </option>
            ))}
          </select>
          {err('leadId')}
          {err('customerName')}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Due Date *</label>
            <input type="date" className={inputCls} value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
            {err('dueDate')}
          </div>
          <div>
            <label className={labelCls}>Due Time</label>
            <input type="time" className={inputCls} value={form.dueTime} onChange={(e) => set('dueTime', e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelCls}>Assigned To *</label>
          <select className={selectCls} style={selectStyle} value={form.assignedTo} onChange={(e) => set('assignedTo', e.target.value)}>
            <option value={currentUser.id}>Myself ({currentUser.name})</option>
            {team.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
          </select>
          <p className="mt-1 text-[10px] text-slate-400">AFL to confirm whether a task may be assigned to someone else.</p>
        </div>

        {form.taskType === 'Call' && (
          <div>
            <label className={labelCls}>Call Connected * — mandatory for call type</label>
            <select className={selectCls} style={selectStyle} value={form.callConnected} onChange={(e) => set('callConnected', e.target.value)}>
              <option value="">— Select —</option>
              {CALL_CONNECTED.map((c) => <option key={c}>{c}</option>)}
            </select>
            {err('callConnected')}
          </div>
        )}

        <div>
          <label className={labelCls}>Next Action</label>
          <select className={selectCls} style={selectStyle} value={form.nextAction} onChange={(e) => set('nextAction', e.target.value)}>
            <option value="">— None —</option>
            {NEXT_ACTIONS.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <label className={labelCls}>Next Follow-up Date * — required while the lead is open</label>
          <input type="date" className={inputCls} value={form.nextFollowUpDate} onChange={(e) => set('nextFollowUpDate', e.target.value)} />
          {err('nextFollowUpDate')}
        </div>

        <div>
          <label className={labelCls}>Task Status *</label>
          <select className={selectCls} style={selectStyle} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        {form.status === 'Completed' && (
          <div>
            <label className={labelCls}>Outcome / Remarks * — mandatory on completion</label>
            <textarea className={inputCls} rows={2} value={form.outcome} onChange={(e) => set('outcome', e.target.value)} />
            {err('outcome')}
            {err('completedOn')}
          </div>
        )}
      </div>

      <div className="mt-6 flex gap-3">
        <CancelButton onClick={onClose} />
        <button onClick={submit} className="flex-1 rounded-xl bg-[#861D3F] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#A42B55]">
          Create Task
        </button>
      </div>
    </Modal>
  )
}

export default function Tasks() {
  const { currentUser, role } = useAuth()
  const derived = useMemo(() => scopedTasks(currentUser), [currentUser])
  const [extra, setExtra] = useState([])
  const [overrides, setOverrides] = useState({})

  const tasks = useMemo(
    () => [...extra, ...derived].map((t) => (overrides[t.taskId] ? { ...t, ...overrides[t.taskId] } : t)),
    [derived, extra, overrides],
  )

  const [status, setStatus] = useState('Open')
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return tasks
      .filter((t) => (status === 'all' || t.status === status) && (type === 'all' || t.taskType === type))
      .filter((t) => !q || t.customerName.toLowerCase().includes(q) || t.leadId.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
      .sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.dueDate.localeCompare(b.dueDate))
  }, [tasks, status, type, search])

  const s = taskSummary(tasks)
  const canEdit = can(role, 'editLead')
  const leadsForPicker = useMemo(
    () => [...new Map(derived.map((t) => [t.leadId, { leadId: t.leadId, firstName: t.customerName.split(' ')[0], lastName: t.customerName.split(' ').slice(1).join(' '), product: t.product }])).values()],
    [derived],
  )

  const complete = (task) => {
    setOverrides((o) => ({
      ...o,
      [task.taskId]: { status: 'Completed', completedOn: `${TODAY}T12:00:00`, outcome: 'Marked complete from the Tasks screen.' },
    }))
    auditEvents.taskCompleted(currentUser, task)
  }

  const stats = [
    { label: 'Open', value: s.open, tone: null },
    { label: 'In Progress', value: s.inProgress, tone: null },
    { label: 'Overdue', value: s.overdue, tone: 'critical' },
    { label: 'Due today', value: s.dueToday, tone: null },
    { label: 'Completed', value: s.completed, tone: 'good' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Tasks &amp; Follow-ups</h2>
          <p className="mt-1 text-sm text-slate-500">
            {scopeDescription(currentUser)} · {tasks.length.toLocaleString('en-IN')} tasks
          </p>
        </div>
        <div className="flex items-center gap-2">
          {s.overdue > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2">
              <Clock size={14} className="text-red-600" />
              <span className="text-xs font-semibold text-red-700">{s.overdue} overdue</span>
            </div>
          )}
          {canEdit && (
            <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
              <Plus size={13} /> Create Task
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats.map((x, i) => (
          <div key={x.label} className="rounded-2xl border border-af-border bg-white p-3.5 text-center">
            <p
              className="text-2xl font-bold"
              style={{ color: x.tone === 'critical' ? STATUS.critical : x.tone === 'good' ? ORDINAL_MAROON[5] : undefined }}
            >
              {x.value}
            </p>
            <p className="mt-0.5 text-[10px] font-medium text-slate-400">{x.label}</p>
          </div>
        ))}
      </div>

      {/* The two automations, stated plainly — this is what generates the tasks. */}
      <div className="card flex flex-wrap items-center gap-4 px-4 py-3">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
          <Zap size={12} className="text-[#861D3F]" /> Automations
        </span>
        {TASK_AUTOMATIONS.map((a, i) => (
          <span key={a.key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: ordinalSteps(2)[i] }} />
            {a.when} → {a.taskType} task, {a.priority.toLowerCase()} priority
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Customer, lead ID or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-64 pl-9"
          />
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-af-border bg-white p-1">
          {['all', ...TASK_STATUSES].map((sv) => (
            <button
              key={sv}
              onClick={() => setStatus(sv)}
              aria-pressed={status === sv}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                ${status === sv ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-slate-50 hover:text-gray-700'}`}
            >
              {sv === 'all' ? 'All' : sv}
            </button>
          ))}
        </div>
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-auto">
          <option value="all">All task types</option>
          {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <CheckCircle2 size={30} className="mx-auto mb-3" style={{ color: ORDINAL_MAROON[3] }} />
          <p className="text-sm font-semibold text-gray-800">Nothing here</p>
          <p className="mt-1 text-xs text-slate-400">No tasks match the current filters</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.slice(0, 60).map((t) => (
            <TaskRow
              key={t.taskId}
              task={t}
              canEdit={canEdit}
              expanded={expanded === t.taskId}
              onToggleExpand={(id) => setExpanded(expanded === id ? null : id)}
              onComplete={complete}
            />
          ))}
          {filtered.length > 60 && (
            <p className="py-3 text-center text-xs text-slate-400">
              Showing 60 of {filtered.length.toLocaleString('en-IN')} — narrow the filters to see more
            </p>
          )}
        </div>
      )}

      {creating && (
        <CreateTaskModal
          leads={leadsForPicker}
          team={[]}
          currentUser={currentUser}
          onClose={() => setCreating(false)}
          onSave={(form) =>
            setExtra((prev) => [
              {
                ...form,
                taskId: `TSK-M${String(prev.length + 1).padStart(5, '0')}`,
                createdBy: currentUser.name,
                createdOn: `${TODAY}T09:00:00`,
                assignedToName: currentUser.name,
                completedOn: form.status === 'Completed' ? `${TODAY}T12:00:00` : null,
                product: '—',
                offerAmount: 0,
                automation: null,
                overdue: form.dueDate < TODAY && form.status !== 'Completed',
              },
              ...prev,
            ])
          }
          onAudit={(task) => auditEvents.taskCreated(currentUser, task)}
        />
      )}
    </div>
  )
}

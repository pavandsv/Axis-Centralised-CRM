import { useEffect, useMemo, useState } from 'react'
import {
  Archive, AlertTriangle, CheckCircle2, ChevronDown, Download, EyeOff, Info,
  Lock, LogIn, Search, Settings, Shield, X, XCircle,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { TODAY, auditLog, loginActivity, USERS } from '../data/crm'
import {
  AUDIT_TYPES, RETENTION_YEARS, SEVERITIES, auditFor, auditToCsv,
  canExportAudit, filterAudit,
} from '../logic/audit'
import { auditEvents, getSessionEvents, subscribe } from '../logic/auditTrail'
import { ROLE_CODES } from '../config/roles'
import { PII_DOWNLOAD_BLOCKED_ROLES } from '../config/roles'
import { RoleBadge } from '../components/Badges'
import { STATUS, ordinalSteps } from '../theme/chartTheme'
import Pagination, { usePagination } from '../components/Pagination'

const SEVERITY = {
  info: { label: 'Info', cls: 'bg-slate-100 text-slate-600 border-slate-200', Icon: Info },
  success: { label: 'Success', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  warning: { label: 'Warning', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: AlertTriangle },
  critical: { label: 'Critical', cls: 'bg-red-50 text-red-700 border-red-200', Icon: XCircle },
}
const TYPE_ICON = { login: LogIn, lead: Shield, config: Settings, session: Info }
const PAGE_SIZE = 50

function Row({ row, expanded, onClick }) {
  const sev = SEVERITY[row.severity] || SEVERITY.info
  const TypeIcon = TYPE_ICON[row.type] || Shield
  return (
    <div>
      <button
        onClick={onClick}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left tbl-row ${expanded ? 'bg-[#FDF0F4]/40' : ''}`}
      >
        <span className={`mt-0.5 flex-shrink-0 whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-semibold ${sev.cls}`}>
          {sev.label}
        </span>
        <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <TypeIcon size={13} className="text-slate-500" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-800">{row.actionLabel || row.action.replace(/_/g, ' ')}</p>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs text-slate-500">{row.entity}</span>
            {row.entityId && <span className="font-mono text-xs font-semibold text-[#861D3F]">{row.entityId}</span>}
            {row.live && (
              <span className="rounded-full bg-[#FDF0F4] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#861D3F]">this session</span>
            )}
            {row.retention === 'archived' && (
              <span className="flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                <Archive size={9} /> archived
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-400">
            {row.subject && (
              <span className={row.redacted ? 'italic text-slate-400' : 'font-medium text-slate-500'}>
                {row.subject}
                {' · '}
              </span>
            )}
            {row.detail}
          </p>
        </div>
        <div className="hidden flex-shrink-0 text-right sm:block">
          <p className="text-xs font-medium text-gray-700">{row.actorName}</p>
          <p className="text-[10px] text-slate-400">{row.ts.replace('T', ' ')}</p>
        </div>
        <ChevronDown size={14} className={`mt-0.5 flex-shrink-0 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="animate-fade-in border-b border-af-border bg-af-bg px-4 py-4">
          <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            {[
              ['Log ID', row.id],
              ['Actor', `${row.actorName} (${row.actorRole})`],
              ['Timestamp', row.ts.replace('T', ' ')],
              ['IP address', row.ip],
              ['Entity', `${row.entity} ${row.entityId || ''}`],
              ['Subject', row.subject || '—'],
              ['Contact', row.subjectRef || '—'],
              ['Retention', row.retention === 'archived' ? `Archived (>${RETENTION_YEARS} yrs, retrievable)` : 'Live'],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</p>
                <p className="break-words font-mono text-slate-600">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Detail</p>
            <p className="rounded-xl border border-af-border bg-white px-3 py-2 text-xs text-gray-800">{row.detail || '—'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Audit() {
  const { currentUser, role } = useAuth()
  const [, forceRender] = useState(0)
  useEffect(() => subscribe(() => forceRender((n) => n + 1)), [])

  const [tab, setTab] = useState('activity')
  const [filters, setFilters] = useState({ type: 'all', severity: 'all', actorRole: 'all', from: '', to: '', search: '' })
  const [expanded, setExpanded] = useState(null)
  const [flash, setFlash] = useState(null)

  // Session events sit in front of the derived history, then the whole thing is
  // scoped and redacted for the signed-in role.
  const visible = useMemo(
    () => auditFor([...getSessionEvents(), ...auditLog()], currentUser, TODAY),
    [currentUser, forceRender],
  )
  const filtered = useMemo(() => {
    if (filters.type === 'session') return visible.filter((r) => r.live)
    return filterAudit(visible, filters)
  }, [visible, filters])


  const logins = useMemo(() => loginActivity(), [])
  const { pageRows, props: pageProps } = usePagination(filtered, {
    initialSize: PAGE_SIZE,
    resetOn: [filters, tab, currentUser],
  })
  const counts = useMemo(
    () => ({
      all: visible.length,
      login: visible.filter((r) => r.type === 'login').length,
      lead: visible.filter((r) => r.type === 'lead').length,
      config: visible.filter((r) => r.type === 'config').length,
      session: visible.filter((r) => r.live).length,
    }),
    [visible],
  )
  const redactedCount = visible.filter((r) => r.redacted).length
  const maskedCount = visible.filter((r) => r.subjectRef === '••••••••••').length
  const archived = visible.filter((r) => r.retention === 'archived').length

  const exportAllowed = canExportAudit(role)
  const doExport = () => {
    if (!exportAllowed) {
      auditEvents.exportBlocked(currentUser, 'audit-log')
      setFlash({ tone: 'bad', text: 'Export blocked — and the attempt itself has been logged.' })
      return
    }
    const csv = auditToCsv(filtered, role)
    const note = redactedCount ? 'customer identity redacted' : PII_DOWNLOAD_BLOCKED_ROLES.includes(role) ? 'contact column withheld' : null
    // Downloads are blocked in some embedded contexts, so keep the trail honest
    // either way: log the attempt, then try the download.
    auditEvents.exported(currentUser, 'audit-log', filtered.length, note)
    try {
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `axis-audit-${TODAY}.csv`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      setFlash({ tone: 'good', text: `${filtered.length.toLocaleString('en-IN')} rows exported${note ? ` · ${note}` : ''}. The export is itself logged.` })
    } catch {
      setFlash({ tone: 'bad', text: 'Your browser blocked the download, but the attempt has been logged.' })
    }
  }

  const set = (k, v) => setFilters((f) => ({ ...f, [k]: v }))
  const clearable = filters.type !== 'all' || filters.severity !== 'all' || filters.actorRole !== 'all' || filters.from || filters.to || filters.search

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Shield size={20} className="text-[#861D3F]" /> Audit Logs
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            First login, last login and every user touchpoint · append-only · archived after {RETENTION_YEARS} years, retrievable till date
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={doExport}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs ${exportAllowed ? 'btn-ghost' : 'rounded-xl border border-af-border text-slate-400'}`}
          >
            {exportAllowed ? <Download size={13} /> : <Lock size={13} />}
            {exportAllowed ? 'Export CSV' : `Export not permitted for ${role}`}
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-af-border bg-af-bg p-1">
            {[['activity', 'Activity log'], ['logins', 'Login activity']].map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                aria-pressed={tab === k}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                  ${tab === k ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-white hover:text-[#861D3F]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {flash && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${
            flash.tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <span>{flash.text}</span>
          <button onClick={() => setFlash(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      {/* What this role is NOT being shown — stated, not hidden. */}
      {(redactedCount > 0 || maskedCount > 0) && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-af-border bg-af-bg px-4 py-3">
          <EyeOff size={14} className="mt-0.5 flex-shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-500">
            {redactedCount > 0 && (
              <>
                <strong className="text-slate-600">{redactedCount.toLocaleString('en-IN')} rows</strong> have the customer
                identity redacted — the {role} role carries audit and configuration access with no customer data.{' '}
              </>
            )}
            {maskedCount > 0 && (
              <>
                Contact numbers are masked on <strong className="text-slate-600">{maskedCount.toLocaleString('en-IN')} rows</strong>,
                matching the download restriction that applies from DST up to RH.
              </>
            )}
          </p>
        </div>
      )}

      {tab === 'activity' && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {AUDIT_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => set('type', t.key)}
                aria-pressed={filters.type === t.key}
                className={`rounded-2xl border bg-white p-3.5 text-center transition-all
                  ${filters.type === t.key ? 'border-[#861D3F] ring-2 ring-[#861D3F]/20' : 'border-af-border hover:bg-slate-50'}`}
              >
                <p className="text-2xl font-bold text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {(counts[t.key] ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-0.5 text-[10px] font-medium text-slate-400">{t.label}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[220px] flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Action, actor, entity ID, subject or detail…"
                value={filters.search}
                onChange={(e) => set('search', e.target.value)}
                className="input-field pl-9"
              />
            </div>
            <select value={filters.actorRole} onChange={(e) => set('actorRole', e.target.value)} className="input-field w-auto">
              <option value="all">Any actor role</option>
              <option value="System">System</option>
              {ROLE_CODES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex items-center gap-1 rounded-xl border border-af-border bg-white p-1">
              {SEVERITIES.map((sv) => (
                <button
                  key={sv}
                  onClick={() => set('severity', sv)}
                  aria-pressed={filters.severity === sv}
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-medium capitalize transition-all
                    ${filters.severity === sv ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-af-bg hover:text-gray-800'}`}
                >
                  {sv}
                </button>
              ))}
            </div>
            <input type="date" value={filters.from} max={filters.to || TODAY} onChange={(e) => set('from', e.target.value)} className="rounded-lg border border-af-border px-2 py-1.5 text-xs text-gray-700" />
            <span className="text-xs text-slate-400">to</span>
            <input type="date" value={filters.to} min={filters.from} max={TODAY} onChange={(e) => set('to', e.target.value)} className="rounded-lg border border-af-border px-2 py-1.5 text-xs text-gray-700" />
            {clearable && (
              <button
                onClick={() => setFilters({ type: 'all', severity: 'all', actorRole: 'all', from: '', to: '', search: '' })}
                className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-[#861D3F]"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>

          <div className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-af-border bg-af-bg px-4 py-3">
              <p className="text-xs font-medium text-slate-400">
                {filtered.length.toLocaleString('en-IN')} of {visible.length.toLocaleString('en-IN')} events · newest first
                {archived > 0 && <> · {archived} archived</>}
              </p>
              <p className="text-xs text-slate-400">Click any row to expand</p>
            </div>
            <div className="divide-y divide-af-border/50">
              {pageRows.map((r) => (
                <Row key={r.id} row={r} expanded={expanded === r.id} onClick={() => setExpanded(expanded === r.id ? null : r.id)} />
              ))}
              {!filtered.length && <div className="py-12 text-center text-sm text-slate-400">No events match your filter</div>}
            </div>
            <Pagination {...pageProps} noun="events" />
          </div>
        </>
      )}

      {tab === 'logins' && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
            <LogIn size={15} className="text-[#861D3F]" />
            <h3 className="section-title">Login activity by user</h3>
            <span className="ml-auto text-xs text-slate-400">{logins.length} users</span>
          </div>
          <div className="max-h-[600px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-af-bg">
                <tr className="border-b border-af-border">
                  {['User', 'Role', 'Posting', 'First login', 'Last login', 'Idle', 'Touchpoints', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logins.map((u) => (
                  <tr key={u.id} className="tbl-row">
                    <td className="px-4 py-2.5">
                      <p className="text-xs font-semibold text-gray-800">{u.name}</p>
                      <p className="text-[10px] text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-2.5"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{u.branch}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{u.firstLogin}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{u.lastLogin || <span className="text-slate-300">never</span>}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ fontVariantNumeric: 'tabular-nums', color: u.daysSinceLogin > 5 ? STATUS.critical : undefined }}>
                      {u.daysSinceLogin == null ? '—' : `${u.daysSinceLogin}d`}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{u.touchpoints}</td>
                    <td className="px-4 py-2.5">
                      <span className={`badge-status ${u.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

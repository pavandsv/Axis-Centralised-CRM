import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, EyeOff, LayoutGrid, List, Lock, Plus, Search, Upload, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { AGEING_DAYS, REJECTED_PURGE_DAYS, daysAged, formatINR, scopedLeads } from '../data/crm'
import { LEAD_STATUSES, PORTFOLIOS } from '../data/masters'
import { can, canDownloadPii } from '../config/roles'
import { scopeDescription } from '../logic/visibility'
import { AgeingBadge, ProductBadge, StatusBadge } from '../components/Badges'
import LeadDetailDrawer from '../components/LeadDetailDrawer'
import CreateLeadModal from '../components/modals/CreateLeadModal'
import BulkUploadModal from '../components/modals/BulkUploadModal'
import { ordinalSteps } from '../theme/chartTheme'
import { canExport, download, leadsToCsv, withheldColumns } from '../logic/exportCsv'
import { auditEvents } from '../logic/auditTrail'
import { subscribe, storeVersion } from '../logic/leadStore'
import Pagination, { usePagination } from '../components/Pagination'

/** Kanban shows the working pipeline; terminal outcomes live in the table. */
const KANBAN_STAGES = ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed']

export default function Leads() {
  const { currentUser, role } = useAuth()
  const [version, setVersion] = useState(storeVersion())
  useEffect(() => subscribe(() => setVersion(storeVersion())), [])
  const [showRejected, setShowRejected] = useState(false)
  const [flash, setFlash] = useState(null)

  const allVisible = useMemo(() => scopedLeads(currentUser), [currentUser, version])
  // Governance: rejected leads drop out of the All Leads view. They stay in
  // reports and in the audit trail, and purge from the system at 60 days.
  const book = useMemo(
    () => (showRejected ? allVisible : allVisible.filter((l) => l.leadStatus !== 'Rejected')),
    [allVisible, showRejected],
  )
  const rejectedHidden = allVisible.length - allVisible.filter((l) => l.leadStatus !== 'Rejected').length

  const initialSearch = sessionStorage.getItem('globalSearch') || ''
  if (initialSearch) sessionStorage.removeItem('globalSearch')

  const [view, setView] = useState('table')
  const [search, setSearch] = useState(initialSearch)
  const [status, setStatus] = useState('all')
  const [portfolio, setPortfolio] = useState('all')
  const [selected, setSelected] = useState(null)
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return book.filter((l) => {
      const matches =
        !q ||
        `${l.firstName} ${l.lastName}`.toLowerCase().includes(q) ||
        l.leadId.toLowerCase().includes(q) ||
        l.mobileNumber.includes(q) ||
        (l.lanNo || '').toLowerCase().includes(q)
      return matches && (status === 'all' || l.leadStatus === status) && (portfolio === 'all' || l.portfolio === portfolio)
    })
  }, [book, search, status, portfolio])

  const { pageRows, props: pageProps } = usePagination(filtered, {
    resetOn: [search, status, portfolio, showRejected, view, currentUser],
  })

  const stageColours = ordinalSteps(KANBAN_STAGES.length)
  const exportAllowed = canExport(role)

  const doExport = () => {
    if (!exportAllowed) {
      auditEvents.exportBlocked(currentUser, 'leads')
      setFlash({ tone: 'bad', text: `Export is not permitted for ${role}. The attempt has been logged.` })
      return
    }
    const withheld = withheldColumns(role)
    const csv = leadsToCsv(filtered, role)
    const res = download(`axis-leads-${role}-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    auditEvents.exported(currentUser, 'leads', filtered.length, withheld.length ? `withheld: ${withheld.join(', ')}` : null)
    setFlash({
      tone: res.ok ? 'good' : 'bad',
      text: res.ok
        ? `${filtered.length.toLocaleString('en-IN')} leads exported.${withheld.length ? ` ${withheld.join(', ')} withheld for ${role}.` : ''}`
        : 'Your browser blocked the download — the attempt has been logged.',
    })
  }

  if (!can(role, 'viewOwnLeads')) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center animate-fade-in">
        <Lock size={22} className="mx-auto mb-3 text-slate-300" />
        <h2 className="text-base font-bold text-gray-900">No lead access</h2>
        <p className="mt-1 text-sm text-slate-500">The {role} role does not see customer data.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            {can(role, 'viewTeamLeads') ? 'Leads' : 'My Leads'}
          </h2>
          <p className="text-sm text-slate-500">
            {filtered.length.toLocaleString('en-IN')} of {book.length.toLocaleString('en-IN')} · {scopeDescription(currentUser)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {can(role, 'createLeadManually') && (
            <button onClick={() => setCreating(true)} className="btn-primary flex items-center gap-1.5 px-3 py-2 text-xs">
              <Plus size={13} /> Create Lead
            </button>
          )}
          {can(role, 'uploadExcel') && (
            <button onClick={() => setUploading(true)} className="btn-secondary flex items-center gap-1.5 px-3 py-2 text-xs">
              <Upload size={13} /> Bulk Upload
            </button>
          )}
          <button
            onClick={() => setShowRejected((v) => !v)}
            title={`Rejected leads leave this view and purge at ${REJECTED_PURGE_DAYS} days`}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
              showRejected ? 'border-[#861D3F] bg-[#FDF0F4] text-[#861D3F]' : 'border-af-border text-slate-500 hover:bg-af-bg'
            }`}
          >
            {showRejected ? <Eye size={13} /> : <EyeOff size={13} />}
            Rejected {rejectedHidden > 0 && !showRejected ? `(${rejectedHidden})` : ''}
          </button>
          <button
            onClick={doExport}
            title={canDownloadPii(role) ? undefined : 'Phone, email and pincode are withheld for your role'}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs ${exportAllowed ? 'btn-ghost' : 'rounded-xl border border-af-border text-slate-400'}`}
          >
            {exportAllowed ? <Download size={13} /> : <Lock size={13} />}
            {exportAllowed ? 'Export CSV' : `Export not permitted for ${role}`}
            {exportAllowed && !canDownloadPii(role) && <Lock size={11} className="text-slate-400" />}
          </button>
          <div className="flex items-center gap-1 rounded-xl border border-af-border bg-white p-1">
            <button
              onClick={() => setView('table')}
              aria-label="Table view"
              className={`rounded-lg p-2 transition-all ${view === 'table' ? 'bg-[#861D3F] text-white' : 'text-slate-400 hover:text-gray-700'}`}
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setView('kanban')}
              aria-label="Kanban view"
              className={`rounded-lg p-2 transition-all ${view === 'kanban' ? 'bg-[#861D3F] text-white' : 'text-slate-400 hover:text-gray-700'}`}
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>
      </div>

      {flash && (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${
          flash.tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{flash.text}</span>
          <button onClick={() => setFlash(null)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Name, lead ID, mobile or LAN…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field w-64 pl-9"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          <option value="all">All statuses</option>
          {LEAD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={portfolio} onChange={(e) => setPortfolio(e.target.value)} className="input-field w-auto">
          <option value="all">All portfolios</option>
          {PORTFOLIOS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        {(search || status !== 'all' || portfolio !== 'all') && (
          <button
            onClick={() => { setSearch(''); setStatus('all'); setPortfolio('all') }}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors hover:text-[#861D3F]"
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {view === 'table' && (
        <div className="card overflow-hidden">
          <div className="max-h-[calc(100vh-300px)] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-af-bg">
                <tr className="border-b border-af-border">
                  {['Lead ID', 'Customer', 'Product', 'Offer', 'Owner', 'Branch', 'Status', 'Ageing', 'Created'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-4 py-2.5 text-left text-xs font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => (
                  <tr key={l.leadId} className="tbl-row cursor-pointer" onClick={() => setSelected(l)}>
                    <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-400">{l.leadId}</td>
                    <td className="px-4 py-2.5">
                      <p className="text-sm font-semibold text-gray-800">{l.firstName} {l.lastName}</p>
                      <p className="text-xs text-slate-400">{l.mobileNumber}</p>
                    </td>
                    <td className="px-4 py-2.5"><ProductBadge product={l.product} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sm font-bold text-[#861D3F]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(l.offerAmount)}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{l.assignedToName || <span className="text-amber-600">Parked</span>}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{l.branch || 'Unmapped'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={l.leadStatus} /></td>
                    <td className="px-4 py-2.5"><AgeingBadge days={daysAged(l)} threshold={AGEING_DAYS} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs text-slate-400">{l.leadCreatedDate.slice(0, 10)}</td>
                  </tr>
                ))}
                {!filtered.length && (
                  <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-400">No leads match your filters</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <Pagination {...pageProps} noun="leads" />
        </div>
      )}

      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex min-w-max gap-4">
            {KANBAN_STAGES.map((stage, i) => {
              const rows = filtered.filter((l) => l.leadStatus === stage)
              return (
                <div key={stage} className="w-[240px] flex-shrink-0">
                  <div className="mb-3 flex items-center gap-2 rounded-xl border border-af-border bg-white px-3 py-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: stageColours[i] }} />
                    <p className="truncate text-xs font-semibold text-gray-700">{stage}</p>
                    <span className="ml-auto flex-shrink-0 rounded-full bg-af-bg px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{rows.length}</span>
                  </div>
                  <div className="max-h-[calc(100vh-330px)] space-y-2 overflow-y-auto pr-1">
                    {rows.slice(0, 40).map((l) => (
                      <button
                        key={l.leadId}
                        onClick={() => setSelected(l)}
                        className="shadow-card w-full rounded-2xl border border-af-border bg-white p-3 text-left transition-all duration-150 hover:border-[#861D3F]/20 hover:shadow-md"
                      >
                        <div className="mb-1.5 flex items-start justify-between gap-1.5">
                          <p className="text-xs font-semibold leading-tight text-gray-800">{l.firstName} {l.lastName}</p>
                          <ProductBadge product={l.product} />
                        </div>
                        <p className="text-xs font-bold text-[#861D3F]">{formatINR(l.offerAmount)}</p>
                        <p className="mt-1 truncate text-[10px] text-slate-400">{l.city} · {l.assignedToName || 'Parked'}</p>
                        <p className="mt-1.5 font-mono text-[10px] text-slate-300">{l.leadId}</p>
                      </button>
                    ))}
                    {!rows.length && (
                      <div className="flex h-16 items-center justify-center rounded-xl border-2 border-dashed border-af-border/50">
                        <p className="text-[10px] text-slate-300">None</p>
                      </div>
                    )}
                    {rows.length > 40 && <p className="py-2 text-center text-[10px] text-slate-400">+{rows.length - 40} more</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {selected && (
        <LeadDetailDrawer
          lead={book.find((l) => l.leadId === selected.leadId) || selected}
          role={role}
          currentUser={currentUser}
          onClose={() => setSelected(null)}
          onChanged={(msg) => setFlash({ tone: 'good', text: msg })}
        />
      )}

      {uploading && (
        <BulkUploadModal
          currentUser={currentUser}
          onClose={() => setUploading(false)}
          onDone={(report) =>
            report?.accepted?.length &&
            setFlash({ tone: 'good', text: `${report.accepted.length} lead(s) imported and routed · ${report.rejected.length} rejected.` })
          }
        />
      )}

      {creating && (
        <CreateLeadModal
          currentUser={currentUser}
          onClose={() => setCreating(false)}
          onCreated={({ lead, decision }) =>
            setFlash({
              tone: 'good',
              text: `${lead.leadId} created — rule ${decision.ruleNo} (${decision.ruleName}) ${decision.outcome === 'assigned' ? `assigned it to ${lead.assignedToName}` : `parked it: ${decision.reason}`}.`,
            })
          }
        />
      )}
    </div>
  )
}

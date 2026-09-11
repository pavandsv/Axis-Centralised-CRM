import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowRight, Lock, X } from 'lucide-react'
import { ProductBadge, StatusBadge, AgeingBadge } from './Badges'
import { AGEING_DAYS, daysAged, formatINR, summarise } from '../data/crm'
import { can, canDownloadPii } from '../config/roles'
import LeadDetailDrawer from './LeadDetailDrawer'
import { ORDINAL_MAROON, ordinalSteps } from '../theme/chartTheme'
import Pagination, { usePagination } from './Pagination'

const countBy = (arr, fn) =>
  arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m }, {})

/**
 * The panel behind every widget tile and every chart mark. It answers three
 * questions in order — how big is this slice, how does it break down, and what
 * are the actual records — then hands off to the full lead detail.
 *
 * PII stays visible on screen (all these roles can see it) but the export
 * affordance respects the DPDP restriction for DST through RH.
 */
export default function LeadListDrawer({ title, subtitle, leads, role, onClose }) {
  const [openLead, setOpenLead] = useState(null)
  const [sortBy, setSortBy] = useState('created')

  const stats = useMemo(() => summarise(leads), [leads])
  const byStatus = useMemo(
    () => Object.entries(countBy(leads, (l) => l.leadStatus)).sort((a, b) => b[1] - a[1]),
    [leads],
  )
  const byOwner = useMemo(
    () => Object.entries(countBy(leads.filter((l) => l.assignedToName), (l) => l.assignedToName))
      .sort((a, b) => b[1] - a[1]).slice(0, 5),
    [leads],
  )
  const byProduct = useMemo(
    () => Object.entries(countBy(leads, (l) => l.product)).sort((a, b) => b[1] - a[1]).slice(0, 5),
    [leads],
  )

  const rows = useMemo(() => {
    const copy = [...leads]
    if (sortBy === 'value') copy.sort((a, b) => b.offerAmount - a.offerAmount)
    else if (sortBy === 'ageing') copy.sort((a, b) => daysAged(b) - daysAged(a))
    else copy.sort((a, b) => b.leadCreatedDate.localeCompare(a.leadCreatedDate))
    return copy
  }, [leads, sortBy])

  const { pageRows, props: pageProps } = usePagination(rows, {
    resetOn: [leads, sortBy],
  })

  const exportAllowed = can(role, 'downloadReports')
  const kpis = [
    { label: 'Leads', value: stats.total.toLocaleString('en-IN') },
    { label: 'Contacted', value: `${stats.contactRate}%` },
    { label: 'Qualified', value: stats.qualified },
    { label: 'Disbursed', value: stats.disbursed },
    { label: 'Disbursed value', value: formatINR(stats.disbursedValue) },
    { label: `Aged >${AGEING_DAYS}d`, value: leads.filter((l) => daysAged(l) >= AGEING_DAYS).length },
  ]
  const maxStatus = byStatus[0]?.[1] || 1

  return createPortal(
    <>
      <div className="fixed inset-0 z-[9990] flex justify-end" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
        <aside className="animate-slide-up relative z-10 flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
          {/* ---- header ---- */}
          <div className="flex items-start justify-between gap-3 border-b border-af-border px-6 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-gray-900">{title}</h2>
              <p className="mt-0.5 text-xs text-slate-400">
                {leads.length.toLocaleString('en-IN')} lead{leads.length === 1 ? '' : 's'}
                {subtitle ? ` · ${subtitle}` : ''}
              </p>
            </div>
            <div className="flex flex-shrink-0 items-center gap-2">
              {exportAllowed ? (
                <span className="flex items-center gap-1.5 rounded-xl border border-af-border px-2.5 py-1.5 text-[11px] font-medium text-slate-500">
                  {canDownloadPii(role) ? 'Export includes contact details' : (<><Lock size={11} /> Export excludes phone &amp; pincode</>)}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 rounded-xl border border-af-border px-2.5 py-1.5 text-[11px] font-medium text-slate-400">
                  <Lock size={11} /> Download not permitted for {role}
                </span>
              )}
              <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-xl border border-af-border text-slate-400 transition-all hover:bg-af-bg hover:text-gray-700">
                <X size={16} />
              </button>
            </div>
          </div>

          {leads.length > 0 && (
            <div className="flex-shrink-0 border-b border-af-border bg-af-bg px-6 py-4">
              {/* ---- how big is this slice ---- */}
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
                {kpis.map((k) => (
                  <div key={k.label} className="rounded-xl border border-af-border bg-white px-3 py-2 text-center">
                    <p className="text-base font-bold leading-none text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {k.value}
                    </p>
                    <p className="mt-1 text-[10px] leading-tight text-slate-400">{k.label}</p>
                  </div>
                ))}
              </div>

              {/* ---- how does it break down ---- */}
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">By status</p>
                  <div className="space-y-1">
                    {byStatus.slice(0, 5).map(([status, n], i) => (
                      <div key={status} className="flex items-center gap-2">
                        <span className="w-24 flex-shrink-0 truncate text-[11px] text-slate-500">{status}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white">
                          <div className="h-full rounded-full" style={{ width: `${(n / maxStatus) * 100}%`, background: ordinalSteps(5)[i] }} />
                        </div>
                        <span className="w-7 flex-shrink-0 text-right text-[11px] font-semibold text-slate-600">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top products</p>
                  <div className="space-y-1">
                    {byProduct.map(([p, n]) => (
                      <div key={p} className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-slate-500">{p}</span>
                        <span className="flex-shrink-0 text-[11px] font-semibold text-slate-600">{n}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Top owners</p>
                  <div className="space-y-1">
                    {byOwner.length ? byOwner.map(([o, n]) => (
                      <div key={o} className="flex items-center justify-between gap-2">
                        <span className="truncate text-[11px] text-slate-500">{o}</span>
                        <span className="flex-shrink-0 text-[11px] font-semibold text-slate-600">{n}</span>
                      </div>
                    )) : <p className="text-[11px] text-slate-400">Unallocated</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- the records ---- */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-af-border px-6 py-2">
            <p className="text-[11px] text-slate-400">Click any row for the full record</p>
            <div className="flex items-center gap-1 rounded-lg border border-af-border p-0.5">
              {[['created', 'Newest'], ['value', 'Value'], ['ageing', 'Ageing']].map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setSortBy(k)}
                  aria-pressed={sortBy === k}
                  className={`rounded-md px-2 py-1 text-[10px] font-semibold transition-all ${sortBy === k ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-af-bg'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-af-bg">
                <tr className="border-b border-af-border">
                  {['Lead ID', 'Customer', 'Product', 'Offer', 'Owner', 'Branch', 'Status', 'Ageing', 'Created', ''].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => (
                  <tr key={l.leadId} className="group tbl-row cursor-pointer" onClick={() => setOpenLead(l)}>
                    <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-400">{l.leadId}</td>
                    <td className="px-3 py-2.5">
                      <p className="text-xs font-semibold text-gray-800">{l.firstName} {l.lastName}</p>
                      <p className="text-[10px] text-slate-400">{l.mobileNumber} · {l.city}</p>
                    </td>
                    <td className="px-3 py-2.5"><ProductBadge product={l.product} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs font-bold text-[#861D3F]" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatINR(l.offerAmount)}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{l.assignedToName || <span className="text-amber-600">Parked</span>}</td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">{l.branch || 'Unmapped'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={l.leadStatus} /></td>
                    <td className="px-3 py-2.5"><AgeingBadge days={daysAged(l)} /></td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-[11px] text-slate-400">{l.leadCreatedDate.slice(0, 10)}</td>
                    <td className="px-3 py-2.5">
                      <ArrowRight size={13} className="text-slate-300 opacity-0 transition-opacity group-hover:opacity-100" />
                    </td>
                  </tr>
                ))}
                {!leads.length && (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-slate-400">Nothing in this slice</td></tr>
                )}
              </tbody>
            </table>
            <Pagination {...pageProps} noun="leads" compact />
          </div>
        </aside>
      </div>

      {/* Third level: the full record, over the list. */}
      {openLead && <LeadDetailDrawer lead={openLead} role={role} onClose={() => setOpenLead(null)} />}
    </>,
    document.body,
  )
}

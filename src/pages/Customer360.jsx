import { useMemo, useState } from 'react'
import {
  Building2, CircleUserRound, Info, Layers, Lock, Repeat, Search, TrendingUp, Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { formatINR } from '../data/crm'
import { customerByKey, findCustomers, repeatCustomers } from '../data/customer360'
import { can } from '../config/roles'
import { PII_DOWNLOAD_BLOCKED_ROLES } from '../config/roles'
import { maskPan } from '../data/masters'
import { ProductBadge, StatusBadge } from '../components/Badges'
import { ORDINAL_MAROON, ordinalSteps } from '../theme/chartTheme'
import Pagination, { usePagination } from '../components/Pagination'

const Row = ({ label, value, mono }) => (
  <div className="flex justify-between gap-3 border-b border-af-border/40 py-1.5 last:border-0">
    <span className="flex-shrink-0 text-xs text-slate-400">{label}</span>
    <span className={`text-right text-xs font-semibold text-gray-800 ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</span>
  </div>
)

const Block = ({ title, icon: Icon, children, note }) => (
  <div className="card p-4">
    <div className="mb-3 flex items-center gap-2">
      {Icon && <Icon size={14} className="text-[#861D3F]" />}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{title}</p>
    </div>
    {children}
    {note && <p className="mt-3 rounded-lg border border-af-border bg-af-bg px-2.5 py-1.5 text-[10px] leading-relaxed text-slate-500">{note}</p>}
  </div>
)

export default function Customer360() {
  const { currentUser, role } = useAuth()
  const [query, setQuery] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)

  const results = useMemo(
    () => (query.trim().length >= 2 ? findCustomers(query, currentUser) : []),
    [query, currentUser],
  )
  const repeats = useMemo(() => repeatCustomers(currentUser), [currentUser])
  const customer = useMemo(
    () => (selectedKey ? customerByKey(selectedKey, currentUser) : null),
    [selectedKey, currentUser],
  )
  const maskPii = PII_DOWNLOAD_BLOCKED_ROLES.includes(role)

  const repeatPage = usePagination(repeats, { initialSize: 25, resetOn: [repeats] })

  if (!can(role, 'viewCustomer360')) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center animate-fade-in">
        <Lock size={22} className="mx-auto mb-3 text-slate-300" />
        <h2 className="text-base font-bold text-gray-900">Customer 360 is restricted</h2>
        <p className="mt-1 text-sm text-slate-500">
          The permission matrix grants Customer 360 to BH, Product Team, HO and Super User. Your role is {role}.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card p-5">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Users size={20} className="text-[#861D3F]" /> Customer 360
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Every enquiry a customer has made, across products and campaigns — matched on UCIC where present, otherwise mobile number
        </p>
        <div className="relative mt-4 max-w-lg">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Name, mobile, UCIC or lead ID…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedKey(null) }}
            className="input-field pl-9"
          />
        </div>
        {results.length > 0 && !customer && (
          <div className="mt-3 max-h-64 divide-y divide-af-border/50 overflow-auto rounded-xl border border-af-border">
            {/* A typeahead, not a table — cap the list rather than paginate it. */}
            {results.slice(0, 25).map((c) => (
              <button key={c.key} onClick={() => setSelectedKey(c.key)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-af-bg">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#861D3F]">
                  <CircleUserRound size={16} className="text-white" strokeWidth={1.5} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-800">{c.name}</p>
                  <p className="truncate text-[10px] text-slate-400">
                    {c.mobileNumber} · {c.city} · {c.leadCount} lead{c.leadCount === 1 ? '' : 's'}
                  </p>
                </div>
                {c.isExistingCustomer && (
                  <span className="flex-shrink-0 rounded-full bg-[#FDF0F4] px-2 py-0.5 text-[9px] font-bold text-[#861D3F]">UCIC</span>
                )}
              </button>
            ))}
            {results.length > 25 && (
              <p className="px-3 py-2 text-center text-[11px] text-slate-400">
                {results.length - 25} more match — keep typing to narrow the search
              </p>
            )}
          </div>
        )}
        {query.trim().length >= 2 && !results.length && (
          <p className="mt-3 text-xs text-slate-400">No customer matches “{query}”</p>
        )}
      </div>

      {!customer && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
            <Repeat size={15} className="text-[#861D3F]" />
            <h3 className="section-title">Customers with more than one enquiry</h3>
            <span className="ml-auto text-xs text-slate-400">cross-sell candidates</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-af-border bg-af-bg">
                {['Customer', 'Location', 'Enquiries', 'Products', 'Disbursed', 'Total offered', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {repeatPage.pageRows.map((c) => (
                <tr key={c.key} className="tbl-row cursor-pointer" onClick={() => setSelectedKey(c.key)}>
                  <td className="px-4 py-2.5">
                    <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                    <p className="text-[10px] text-slate-400">{c.ucic ? `UCIC ${c.ucic}` : c.mobileNumber}</p>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{c.city}, {c.state}</td>
                  <td className="px-4 py-2.5 text-xs font-bold text-[#861D3F]" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.leadCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {c.products.slice(0, 3).map((p) => <ProductBadge key={p} product={p} />)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{c.disbursedCount}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs font-semibold text-slate-700">{formatINR(c.totalOffered)}</td>
                  <td className="px-4 py-2.5 text-[10px] text-slate-300">view →</td>
                </tr>
              ))}
              {!repeats.length && <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-400">No repeat enquiries in the current book</td></tr>}
            </tbody>
          </table>
          <Pagination {...repeatPage.props} noun="customers" />
        </div>
      )}

      {customer && (
        <>
          <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#861D3F]">
                <CircleUserRound size={24} className="text-white" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{customer.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {customer.isExistingCustomer ? `Existing customer · UCIC ${customer.ucic}` : 'New to the bank — no UCIC on file'}
                  {' · '}{customer.city}, {customer.state}
                </p>
              </div>
            </div>
            <button onClick={() => setSelectedKey(null)} className="btn-ghost px-3 py-2 text-xs">Back to list</button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ['Enquiries', customer.leadCount],
              ['Products', customer.products.length],
              ['Open now', customer.openCount],
              ['Qualified', customer.qualifiedCount],
              ['Disbursed', customer.disbursedCount],
              ['Disbursed value', formatINR(customer.disbursedValue)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-af-border bg-white p-3.5 text-center">
                <p className="text-lg font-bold leading-none text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</p>
                <p className="mt-1 text-[10px] text-slate-400">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Block title="Identity" icon={CircleUserRound}>
              <Row label="Mobile" value={customer.mobileNumber} mono />
              <Row label="Alternate" value={customer.alternateMobile} mono />
              <Row label="Email" value={customer.emailId} />
              <Row label="Date of birth" value={customer.dateOfBirth} />
              <Row label="PAN" value={customer.panNumber ? (maskPii ? maskPan(customer.panNumber) : customer.panNumber) : null} mono />
              <Row label="Occupation" value={customer.occupation} />
              <Row label="UCIC" value={customer.ucic} mono />
            </Block>

            <Block title="Relationship" icon={Building2}>
              <Row label="Branch" value={customer.branch} />
              <Row label="Region" value={customer.region} />
              <Row label="Zone" value={customer.zone} />
              <Row label="Pincode" value={customer.pincode} mono />
              <Row label="First enquiry" value={customer.firstSeen?.slice(0, 10)} />
              <Row label="Latest enquiry" value={customer.lastSeen?.slice(0, 10)} />
              <Row label="Total offered" value={formatINR(customer.totalOffered)} />
            </Block>

            <Block
              title="Active loans & eligible offers"
              icon={Info}
              note="Open Point 10 — LOS is out of scope, so these come from a manual data upload. Nothing is shown here until that file is provided; the CRM does not infer it."
            >
              <div className="py-6 text-center">
                <p className="text-sm font-semibold text-slate-500">Awaiting manual upload</p>
                <p className="mt-1 text-xs text-slate-400">
                  {customer.lans.length
                    ? `${customer.lans.length} application number(s) on file: ${customer.lans.slice(0, 2).join(', ')}`
                    : 'No application numbers on file yet'}
                </p>
              </div>
            </Block>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
              <Layers size={15} className="text-[#861D3F]" />
              <h3 className="section-title">All enquiries</h3>
              <span className="ml-auto text-xs text-slate-400">{customer.leads.length}</span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-af-border bg-af-bg">
                  {['Lead ID', 'Product', 'Offer', 'Source', 'Campaign', 'Owner', 'Status', 'Created'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customer.leads.map((l) => (
                  <tr key={l.leadId} className="tbl-row">
                    <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{l.leadId}</td>
                    <td className="px-4 py-2.5"><ProductBadge product={l.product} showName /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-xs font-bold text-[#861D3F]">{formatINR(l.offerAmount)}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">{l.leadSource}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">{l.campaignName}</td>
                    <td className="px-4 py-2.5 text-[11px] text-slate-500">{l.assignedToName || 'Parked'}</td>
                    <td className="px-4 py-2.5"><StatusBadge status={l.leadStatus} /></td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-[11px] text-slate-400">{l.leadCreatedDate.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card p-4">
            <div className="mb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#861D3F]" />
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Consolidated history — every touchpoint across every enquiry
              </p>
            </div>
            <div className="max-h-[360px] overflow-auto">
              {customer.timeline.map((e, i) => (
                <div key={i} className="flex gap-3 border-b border-af-border/40 py-2 last:border-0">
                  <span className="w-32 flex-shrink-0 text-[10px] text-slate-400">{e.ts.replace('T', ' ')}</span>
                  <span className="w-24 flex-shrink-0 font-mono text-[10px] text-slate-400">{e.leadId}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800">{e.action}</p>
                    {e.detail && <p className="text-[10px] text-slate-400">{e.detail}</p>}
                  </div>
                  <span className="w-28 flex-shrink-0 text-right text-[10px] text-slate-500">{e.actor}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

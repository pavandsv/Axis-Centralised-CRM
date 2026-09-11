// ---------------------------------------------------------------------------
// Product Master — MOM 8 Sep: "The existing Product Variants screen is adopted
// as the Product Master and will drive the Product dropdown. Product mapping
// visible to Admin only."
//
// It reads the same PRODUCTS array the Create Lead dropdown reads, so what an
// administrator sees here IS what a DST can pick. Editing is out of scope for
// the POC — there is no backend — and the screen says so rather than offering
// controls that would not persist.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { Package, Search } from 'lucide-react'
import { PORTFOLIOS, PRODUCTS } from '../../data/masters'
import { PORTFOLIO_STYLE } from '../Badges'
import Pagination, { usePagination } from '../Pagination'

const formatTicket = ([min, max]) => {
  const money = (n) => (n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` : `₹${(n / 100000).toFixed(2)} L`)
  return `${money(min)} – ${money(max)}`
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export default function ProductMaster() {
  const [query, setQuery] = useState('')
  const [portfolio, setPortfolio] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PRODUCTS.filter(
      (p) =>
        (portfolio === 'all' || p.portfolio === portfolio) &&
        (!q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)),
    )
  }, [query, portfolio])

  const { pageRows, props: pageProps } = usePagination(rows, { resetOn: [query, portfolio] })

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product or code"
            className="h-9 w-full rounded-xl border border-af-border bg-white pl-9 pr-3 text-sm outline-none focus:border-[#861D3F]"
          />
        </div>
        <select
          value={portfolio}
          onChange={(e) => setPortfolio(e.target.value)}
          className="h-9 rounded-xl border border-af-border bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#861D3F]"
        >
          <option value="all">All portfolios</option>
          {PORTFOLIOS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <span className="text-xs text-slate-400">{rows.length} of {PRODUCTS.length} products</span>
      </div>

      <div className="card overflow-hidden">
        <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
          <Package size={15} className="text-[#861D3F]" />
          <h3 className="section-title">Product Master — drives the Product dropdown</h3>
          <span className="ml-auto text-xs text-slate-400">Admin only</span>
        </div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-af-bg">
              <tr className="border-b border-af-border">
                {['Product', 'Code', 'Portfolio', 'Ticket size', 'Tenure', 'ROI', 'Employment', 'Peak months'].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p) => (
                <tr key={p.code} className="tbl-row">
                  <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{p.name}</td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{p.code}</td>
                  <td className="px-3 py-2.5">
                    <span className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${PORTFOLIO_STYLE[p.portfolio] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                      {p.portfolio}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatTicket(p.ticket)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{p.tenure}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">{p.roi}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-500">{p.employment.join(', ')}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-400">
                    {p.season.length ? p.season.map((m) => MONTHS[m]).join(', ') : 'Year-round'}
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">No product matches that search</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination {...pageProps} noun="products" />
      </div>

      <p className="mt-3 text-[11px] text-slate-400">
        Adding and editing products is a build-phase capability. This POC runs
        entirely in the browser with no backend, so the master is shown read-only
        rather than offering controls that would not persist.
      </p>
    </>
  )
}

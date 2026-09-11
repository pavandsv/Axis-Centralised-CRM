import { useMemo, useState } from 'react'
import { Download, Globe, Layers, Lock, Map } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  TODAY, formatINR, masterReport, portfolioReport, productReport,
  regionsIn, resolveReportRange, scopedLeads, zoneReport,
} from '../data/crm'
import { can, canDownloadPii } from '../config/roles'
import { scopeDescription } from '../logic/visibility'
import ChartCard from '../components/charts/ChartCard'
import { ordinalSteps } from '../theme/chartTheme'
import LeadListDrawer from '../components/LeadListDrawer'
import { canExport, download, rowsToCsv, withheldColumns } from '../logic/exportCsv'
import { auditEvents } from '../logic/auditTrail'
import Pagination, { usePagination } from '../components/Pagination'

const REPORTS = [
  { key: 'master', label: 'Master Report', icon: Map },
  { key: 'product', label: 'Product Wise Report', icon: Layers },
]

/** A reusable report table with a sticky header and a totals row. */
function ReportTable({ columns, rows, total, keyField, onDrill, noun = 'rows' }) {
  // The tfoot total stays outside the page — it is the grand total for the
  // whole report, not for the rows currently on screen.
  const { pageRows, props: pageProps } = usePagination(rows, { resetOn: [rows] })

  return (
    <>
    <div className="max-h-[540px] overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-af-bg">
          <tr className="border-b border-af-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`whitespace-nowrap px-3 py-2.5 text-[11px] font-semibold text-slate-400 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageRows.map((r) => (
            <tr
              key={r[keyField]}
              className={`tbl-row ${onDrill ? 'cursor-pointer' : ''}`}
              onClick={onDrill ? () => onDrill(r) : undefined}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2.5 text-xs ${c.align === 'right' ? 'text-right' : 'text-left'} ${c.strong ? 'font-semibold text-gray-800' : 'text-slate-600'}`}
                  style={c.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                >
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length && (
            <tr><td colSpan={columns.length} className="px-3 py-12 text-center text-sm text-slate-400">Nothing in this slice</td></tr>
          )}
        </tbody>
        {total && (
          <tfoot className="sticky bottom-0">
            <tr className="border-t-2 border-af-border bg-af-bg">
              {columns.map((c) => (
                <td
                  key={c.key}
                  className={`whitespace-nowrap px-3 py-2.5 text-xs font-bold text-gray-800 ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  style={c.align === 'right' ? { fontVariantNumeric: 'tabular-nums' } : undefined}
                >
                  {c.render ? c.render(total) : total[c.key]}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
    <Pagination {...pageProps} noun={noun} compact />
    </>
  )
}

const METRIC_COLS = [
  { key: 'leads', label: 'Leads', align: 'right' },
  { key: 'contacted', label: 'Contacted', align: 'right' },
  { key: 'contactRate', label: 'Contact %', align: 'right', render: (r) => `${r.contactRate}%` },
  { key: 'loginInitiated', label: 'Login Init.', align: 'right' },
  { key: 'qualified', label: 'Qualified', align: 'right' },
  { key: 'disbursed', label: 'Disbursed', align: 'right' },
  { key: 'disbursalRate', label: 'Disb %', align: 'right', render: (r) => `${r.disbursalRate}%` },
  { key: 'dqRate', label: 'DQ %', align: 'right', render: (r) => `${r.dqRate}%` },
  { key: 'slaCompliance', label: 'SLA %', align: 'right', render: (r) => `${r.slaCompliance}%` },
  { key: 'value', label: 'Disbursed value', align: 'right', render: (r) => formatINR(r.value) },
]

export default function Analytics() {
  const { currentUser, role } = useAuth()
  const [report, setReport] = useState('master')
  const [mode, setMode] = useState('RTD')
  const [tillDate, setTillDate] = useState(TODAY)
  const [custom, setCustom] = useState({ from: '2026-04-01', to: TODAY })
  const [region, setRegion] = useState('all')
  const [drill, setDrill] = useState(null)
  const [flash, setFlash] = useState(null)

  const range = useMemo(
    () => resolveReportRange(mode, mode === 'Custom' ? custom : { to: tillDate }),
    [mode, custom, tillDate],
  )
  const leads = useMemo(() => scopedLeads(currentUser, range), [currentUser, range])

  const master = useMemo(() => masterReport(leads), [leads])
  const zones = useMemo(() => zoneReport(leads), [leads])
  const product = useMemo(() => productReport(leads, region), [leads, region])
  const portfolios = useMemo(() => portfolioReport(product.scoped), [product.scoped])
  const regions = useMemo(() => regionsIn(leads), [leads])

  const exportAllowed = canExport(role)

  /** Export whichever report is on screen, as its own columns. */
  const doExport = () => {
    if (!exportAllowed) {
      auditEvents.exportBlocked(currentUser, `analytics:${report}`)
      setFlash({ tone: 'bad', text: `Export is not permitted for ${role}. The attempt has been logged.` })
      return
    }
    const isMaster = report === 'master'
    const columns = [
      isMaster ? { key: 'region', label: 'Region' } : { key: 'product', label: 'Product' },
      isMaster ? { key: 'zone', label: 'Zone' } : { key: 'portfolio', label: 'Portfolio' },
      ...METRIC_COLS.map((c) => ({ key: c.key, label: c.label, render: c.render })),
    ]
    const rows = isMaster ? [...master.rows, master.total] : [...product.rows, product.total]
    const name = `axis-${isMaster ? 'master' : 'product-wise'}-report-${range.to}.csv`
    const res = download(name, rowsToCsv(rows, columns))
    auditEvents.exported(currentUser, `analytics:${report}`, rows.length, `${range.from} to ${range.to}`)
    setFlash({
      tone: res.ok ? 'good' : 'bad',
      text: res.ok
        ? `${isMaster ? 'Master' : 'Product Wise'} Report exported — ${rows.length} rows for ${range.label}.`
        : 'Your browser blocked the download — the attempt has been logged.',
    })
  }

  /** Every mark and every row resolves back to the leads that produced it. */
  const drillRegion = ({ label, region: r }) => {
    const name = r || label
    if (!name) return
    const rows = name === 'Unmapped / OGL'
      ? leads.filter((l) => !l.region)
      : leads.filter((l) => l.region === name)
    setDrill({ title: `Region · ${name}`, leads: rows, subtitle: range.label })
  }
  const drillZone = ({ label, zone }) => {
    const name = zone || label
    if (!name) return
    setDrill({ title: `Zone · ${name}`, leads: leads.filter((l) => l.zone === name), subtitle: range.label })
  }
  const drillPortfolio = ({ label, portfolio }) => {
    const name = portfolio || label
    if (!name) return
    setDrill({ title: `Portfolio · ${name}`, leads: product.scoped.filter((l) => l.portfolio === name), subtitle: region === 'all' ? range.label : `${region} · ${range.label}` })
  }
  const drillProduct = ({ label, product: p }) => {
    const name = p || label
    if (!name) return
    setDrill({ title: `Product · ${name}`, leads: product.scoped.filter((l) => l.product === name), subtitle: region === 'all' ? range.label : `${region} · ${range.label}` })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
          <p className="mt-1 text-sm text-slate-500">
            {currentUser.role} · {scopeDescription(currentUser)} ·{' '}
            <span className="font-semibold text-[#861D3F]">{leads.length.toLocaleString('en-IN')} leads in scope</span>
          </p>
        </div>
        <button
          onClick={doExport}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs ${exportAllowed ? 'btn-ghost' : 'rounded-xl border border-af-border text-slate-400'}`}
        >
          {exportAllowed ? <Download size={13} /> : <Lock size={13} />}
          {exportAllowed ? 'Export report' : `Download not permitted for ${role}`}
        </button>
      </div>

      {/* Report picker + one filter row scoping both reports. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-2xl border border-af-border bg-white p-1.5">
          {REPORTS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setReport(key)}
              aria-pressed={report === key}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150
                ${report === key ? 'bg-[#861D3F] text-white shadow-maroon' : 'text-af-muted hover:bg-af-bg hover:text-af-text'}`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-af-border bg-af-bg p-1">
            {['RTD', 'Custom'].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                  ${mode === m ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-white hover:text-[#861D3F]'}`}
              >
                {m === 'RTD' ? 'Report till date' : 'Custom range'}
              </button>
            ))}
          </div>
          {mode === 'RTD' ? (
            <input
              type="date"
              value={tillDate}
              max={TODAY}
              onChange={(e) => setTillDate(e.target.value)}
              className="rounded-lg border border-af-border px-2 py-1.5 text-xs text-gray-700"
            />
          ) : (
            <div className="flex items-center gap-2">
              <input type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="rounded-lg border border-af-border px-2 py-1.5 text-xs text-gray-700" />
              <span className="text-xs text-slate-400">to</span>
              <input type="date" value={custom.to} min={custom.from} max={TODAY} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="rounded-lg border border-af-border px-2 py-1.5 text-xs text-gray-700" />
            </div>
          )}
          {report === 'product' && (
            <select value={region} onChange={(e) => setRegion(e.target.value)} className="input-field w-auto">
              <option value="all">All regions</option>
              {regions.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>
      </div>

      {flash && (
        <div className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-xs font-medium ${
          flash.tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          <span>{flash.text}</span>
          <button onClick={() => setFlash(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      <p className="text-[11px] text-slate-400">{range.label} · {range.from} → {range.to}</p>

      {report === 'master' && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Leads by Region"
              subtitle="Region-wise volume in this period"
              icon={Map}
              kind="share"
              data={master.rows.map((r) => ({ name: r.region, value: r.leads }))}
              nameKey="name"
              valueKey="value"
              xLabel="Region"
              height={260}
              types={['hbar', 'donut', 'table']}
              defaultType="hbar"
              colors={ordinalSteps(master.rows.length)}
              onDrill={drillRegion}
              drillHint="Click a region to list its leads"
            />
            <ChartCard
              title="Disbursed Value by Zone"
              subtitle="Where the money actually landed"
              icon={Globe}
              kind="share"
              data={zones.map((z) => ({ name: z.zone, value: z.value }))}
              nameKey="name"
              valueKey="value"
              xLabel="Zone"
              height={260}
              types={['hbar', 'donut', 'table']}
              defaultType="hbar"
              colors={ordinalSteps(zones.length)}
              valueFormat={formatINR}
              formatter={formatINR}
              onDrill={drillZone}
              drillHint="Click a zone to list its leads"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
              <Map size={15} className="text-[#861D3F]" />
              <h3 className="section-title">Master Report — region wise</h3>
              <span className="ml-auto text-xs text-slate-400">{master.rows.length} regions</span>
            </div>
            <ReportTable
              noun="regions"
              keyField="region"
              onDrill={drillRegion}
              rows={master.rows}
              total={master.total}
              columns={[
                { key: 'region', label: 'Region', strong: true },
                { key: 'zone', label: 'Zone' },
                { key: 'branches', label: 'Branches', align: 'right' },
                ...METRIC_COLS,
              ]}
            />
          </div>
        </>
      )}

      {report === 'product' && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard
              title="Leads by Portfolio"
              subtitle={region === 'all' ? 'All regions' : region}
              icon={Layers}
              kind="share"
              data={portfolios.map((p) => ({ name: p.portfolio, value: p.leads }))}
              nameKey="name"
              valueKey="value"
              xLabel="Portfolio"
              height={260}
              types={['hbar', 'donut', 'table']}
              defaultType="hbar"
              colors={ordinalSteps(portfolios.length)}
              onDrill={drillPortfolio}
              drillHint="Click a portfolio to list its leads"
            />
            <ChartCard
              title="Disbursed Value by Product"
              subtitle="Top products by value"
              icon={Layers}
              kind="share"
              data={[...product.rows].sort((a, b) => b.value - a.value).slice(0, 8).map((p) => ({ name: p.product, value: p.value }))}
              nameKey="name"
              valueKey="value"
              xLabel="Product"
              height={260}
              types={['hbar', 'table']}
              defaultType="hbar"
              colors={ordinalSteps(8)}
              valueFormat={formatINR}
              formatter={formatINR}
              onDrill={drillProduct}
              drillHint="Click a product to list its leads"
            />
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
              <Layers size={15} className="text-[#861D3F]" />
              <h3 className="section-title">
                Product Wise Report{region === 'all' ? ' — all regions' : ` — ${region}`}
              </h3>
              <span className="ml-auto text-xs text-slate-400">{product.rows.length} products</span>
            </div>
            <ReportTable
              noun="products"
              keyField="product"
              onDrill={drillProduct}
              rows={product.rows}
              total={product.total}
              columns={[
                { key: 'product', label: 'Product', strong: true },
                { key: 'portfolio', label: 'Portfolio' },
                ...METRIC_COLS,
              ]}
            />
          </div>
        </>
      )}

      {drill && (
        <LeadListDrawer
          title={drill.title}
          subtitle={drill.subtitle}
          leads={drill.leads}
          role={role}
          onClose={() => setDrill(null)}
        />
      )}
    </div>
  )
}

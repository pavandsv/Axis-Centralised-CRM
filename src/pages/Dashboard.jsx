import { useEffect, useMemo, useState } from 'react'
import {
  Activity, AlertTriangle, BarChart3, CalendarClock, Database, Layers,
  ArrowLeftRight, CheckCircle2, MapPinOff, ShieldCheck, TrendingUp, Users, Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  RANGE_PRESETS, TODAY, AGEING_DAYS,
  ageingBucketLeads, ageingLeads, campaignPerformance, dataQualityByReason, formatINR,
  leadsByProduct, overdueFollowUps, platformActivity, resolveRange, scopeDescription,
  scopedLeads, slaCompliance, summarise, teamProductivity, teamProductivityHeadline,
  unallocatedLeads, widgetLeads, widgetUsers, widgets,
} from '../data/crm'
import { can, canReassign } from '../config/roles'
import { ReassignLeadModal } from '../components/modals/ReassignLeadModal'
import BulkAssignModal from '../components/modals/BulkAssignModal'
import { storeVersion, subscribe as subscribeLeads } from '../logic/leadStore'
import ChartCard from '../components/charts/ChartCard'
import WidgetTile from '../components/WidgetTile'
import LeadListDrawer from '../components/LeadListDrawer'
import UserListDrawer from '../components/UserListDrawer'
import { AgeingBadge, ProductBadge, StatusBadge } from '../components/Badges'
import { CATEGORICAL, FUNNEL_PALETTE, ORDINAL_MAROON, STATUS, ordinalSteps } from '../theme/chartTheme'
import Pagination, { usePagination } from '../components/Pagination'

const CONTACTED_SET = new Set(['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed'])
const OPEN_SET = new Set(['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned'])
// Cumulative-reach, matching platformActivity(): a disbursed lead also logged in.
const LOGGED_IN_SET = new Set(['Login Initiated', 'Sanctioned', 'Disbursed'])

// MOM 8 Sep added Sanctioned, which the mockup was missing. Five overlapping
// lines are read by identity, so they take FUNNEL_PALETTE — a validated
// categorical set — not the ordinal ramp, which at five steps leaves adjacent
// stages indistinguishable (see the note on FUNNEL_PALETTE).
const FUNNEL_STAGES = [
  { key: 'leads', label: 'Leads received' },
  { key: 'contacted', label: 'Contacted' },
  { key: 'loggedIn', label: 'Logged In' },
  { key: 'sanctioned', label: 'Sanctioned' },
  { key: 'disbursed', label: 'Disbursed' },
]
const FUNNEL_SERIES = FUNNEL_STAGES.map((s, i) => ({ ...s, color: FUNNEL_PALETTE[i] }))

// Conversion is disbursed ÷ leads received. It rides in the tooltip and the
// table rather than on the chart: a percentage and a count share no axis.
const CONVERSION_COLUMN = {
  key: 'conversion',
  label: 'Conversion %',
  render: (row) => `${row.conversion}%`,
}

/** A card wrapper for the components that are tables rather than charts. */
function Panel({ title, icon: Icon, count, tone, action, children, className = '' }) {
  return (
    <div className={`card overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
        <Icon size={15} className={tone === 'critical' ? 'text-red-600' : 'text-[#861D3F]'} />
        <h3 className="section-title truncate">{title}</h3>
        {count != null && (
          <span
            className={`ml-auto flex-shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              tone === 'critical'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-[#861D3F]/15 bg-[#FDF0F4] text-[#861D3F]'
            }`}
          >
            {count}
          </span>
        )}
        {action && <div className="ml-auto flex-shrink-0">{action}</div>}
      </div>
      {children}
    </div>
  )
}

const Empty = ({ children }) => (
  <div className="px-4 py-10 text-center text-sm text-slate-400">{children}</div>
)

export default function Dashboard() {
  const { currentUser, role } = useAuth()
  const [preset, setPreset] = useState('MTD')
  const [custom, setCustom] = useState({ from: '2026-04-01', to: TODAY })
  const [drill, setDrill] = useState(null)

  // Unallocated Leads is the one component on this screen that writes, so it
  // needs the store's version to re-read after an assignment.
  const [version, setVersion] = useState(storeVersion())
  useEffect(() => subscribeLeads(() => setVersion(storeVersion())), [])
  const [picked, setPicked] = useState(() => new Set())
  const [assignOne, setAssignOne] = useState(null)
  const [assignMany, setAssignMany] = useState(false)
  const [flash, setFlash] = useState(null)
  const [userDrill, setUserDrill] = useState(null)

  const range = useMemo(() => resolveRange(preset, custom), [preset, custom])
  const leads = useMemo(() => scopedLeads(currentUser, range), [currentUser, range])
  const book = useMemo(() => scopedLeads(currentUser), [currentUser, version])
  const tiles = useMemo(() => widgets(currentUser, range), [currentUser, range])

  // MOM 8 Sep: Platform Activity is yearly, so it reads the whole book rather
  // than the selected range — an MTD filter would otherwise leave one column.
  const activity = useMemo(() => platformActivity(book, { months: 12 }), [book])
  const yearConversion = useMemo(() => {
    const received = activity.reduce((a, m) => a + m.leads, 0)
    const out = activity.reduce((a, m) => a + m.disbursed, 0)
    return received ? +((out / received) * 100).toFixed(1) : 0
  }, [activity])

  const products = useMemo(() => leadsByProduct(leads), [leads])
  const campaigns = useMemo(() => campaignPerformance(leads), [leads])
  const ageing = useMemo(() => ageingLeads(book), [book])
  const unalloc = useMemo(() => unallocatedLeads(book), [book])

  const mayAssign = canReassign(role)
  // A lead that gets assigned leaves `unalloc`, so stale ids are dropped rather
  // than left selected and silently re-assigned on the next mass action.
  const liveIds = useMemo(() => new Set(unalloc.map((l) => l.leadId)), [unalloc])
  const pickedLeads = useMemo(
    () => unalloc.filter((l) => picked.has(l.leadId)),
    [unalloc, picked],
  )
  useEffect(() => {
    setPicked((prev) => {
      const next = new Set([...prev].filter((id) => liveIds.has(id)))
      return next.size === prev.size ? prev : next
    })
  }, [liveIds])

  const unallocPage = usePagination(unalloc, { initialSize: 25, resetOn: [unalloc] })

  const togglePick = (id) =>
    setPicked((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  const overdue = useMemo(() => overdueFollowUps(book), [book])
  const team = useMemo(() => teamProductivity(currentUser, book), [currentUser, book])
  const teamStat = useMemo(() => teamProductivityHeadline(currentUser, book), [currentUser, book])

  // A BH sees 161 reports and a campaign list of any length; both panels page
  // rather than becoming an endless scroll inside a card.
  const teamPage = usePagination(team, { initialSize: 25, resetOn: [team] })
  const campaignPage = usePagination(campaigns, { initialSize: 25, resetOn: [campaigns] })
  const dq = useMemo(() => dataQualityByReason(leads), [leads])
  const sla = useMemo(() => slaCompliance(book), [book])
  const totals = useMemo(() => summarise(leads), [leads])

  // IT Team: audit and configuration only, no customer data. Say so plainly
  // rather than showing a dashboard full of zeroes.
  if (!can(role, 'viewDashboard')) {
    return (
      <div className="animate-fade-in">
        <div className="card mx-auto max-w-xl p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FDF0F4]">
            <ShieldCheck size={22} className="text-[#861D3F]" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Audit and configuration access</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">
            The {role} role holds user administration and audit access only. Per the
            requirement sheet it sees no customer data, so no lead dashboard is shown.
          </p>
          <p className="mt-4 text-xs text-slate-400">Audit Logs and User Administration are available in the menu.</p>
        </div>
      </div>
    )
  }

  const openDrill = (key, title) => {
    // The Users tile counts people, so it opens the user list. Sending it to
    // the lead drawer showed a number unrelated to the one on the tile.
    if (key === 'users') {
      setUserDrill(widgetUsers(currentUser))
      return
    }
    setDrill({ title, leads: widgetLeads(currentUser, range, key), subtitle: range.label })
  }

  /** Chart drill-through: map a clicked mark back to its underlying leads. */
  const drillActivity = ({ label, seriesKey }) => {
    const month = activity.find((a) => a.month === label)
    if (!month) return
    // Read the same book the chart plots. This component is yearly and ignores
    // the MTD/QTD/YTD selector, so filtering the range-scoped `leads` here
    // returned nothing for every month outside the selected range.
    const inMonth = book.filter((l) => l.monthLabel === month.monthLabel)
    const bySeries = {
      leads: inMonth,
      contacted: inMonth.filter((l) => CONTACTED_SET.has(l.leadStatus)),
      loggedIn: inMonth.filter((l) => LOGGED_IN_SET.has(l.leadStatus)),
      sanctioned: inMonth.filter((l) => ['Sanctioned', 'Disbursed'].includes(l.leadStatus)),
      disbursed: inMonth.filter((l) => l.leadStatus === 'Disbursed'),
    }
    const rows = bySeries[seriesKey] || inMonth
    const seriesLabel = FUNNEL_SERIES.find((f) => f.key === seriesKey)?.label || 'Leads received'
    setDrill({ title: `${seriesLabel} — ${month.monthLabel}`, leads: rows, subtitle: 'Platform Activity' })
  }

  const drillProduct = ({ label }) => {
    if (!label) return
    // "Other (n products)" folds a tail — resolve it back to everything not shown.
    if (String(label).startsWith('Other')) {
      const named = new Set(products.filter((p) => !String(p.name).startsWith('Other')).map((p) => p.name))
      setDrill({ title: 'Other products', leads: leads.filter((l) => !named.has(l.product)), subtitle: 'Lead Distribution by Product' })
      return
    }
    setDrill({ title: label, leads: leads.filter((l) => l.product === label), subtitle: 'Lead Distribution by Product' })
  }

  const drillAgeing = ({ label }) => {
    const bucket = ageing.find((b) => b.label === label)
    if (!bucket) return
    // Same helper the chart uses, so the bar and the list always agree.
    const rows = ageingBucketLeads(book, label)
    setDrill({ title: `Open leads · ${label} in status`, leads: rows, subtitle: bucket.breached ? `Beyond the ${AGEING_DAYS}-day rule` : 'Within the rule' })
  }

  const drillReason = ({ label, datum }) => {
    const code = datum?.code
    const rows = leads.filter((l) => (code ? l.reasonCode === code : l.reason === label))
    setDrill({ title: `Reason · ${label}`, leads: rows, subtitle: 'Data Quality by Reason' })
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ---------- header ---------- */}
      <div className="hero-panel flex flex-wrap items-start justify-between gap-4 p-5">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg, #861D3F 0%, #B02A50 100%)' }}
            aria-hidden
          >
            {currentUser.avatar}
          </span>
          <div className="min-w-0">
            <h2 className="text-xl font-bold tracking-tight text-gray-900">
              {currentUser.name.split(' ')[0]}'s dashboard
            </h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-500">
              <span className="rounded-md bg-white/70 px-1.5 py-0.5 text-[11px] font-bold text-[#861D3F] ring-1 ring-[#861D3F]/15">
                {currentUser.role}
              </span>
              {scopeDescription(currentUser)}
              <span className="text-slate-300">·</span>
              <span className="font-semibold text-[#861D3F]">
                {book.length.toLocaleString('en-IN')} leads in your book
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          {/* One filter row, scoping everything below it. */}
          <div className="flex items-center gap-1 rounded-xl border border-af-border bg-af-bg p-1">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => setPreset(p)}
                aria-pressed={preset === p}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                  ${preset === p ? 'bg-[#861D3F] text-white shadow-sm' : 'text-slate-500 hover:bg-white hover:text-[#861D3F]'}`}
              >
                {p}
              </button>
            ))}
          </div>
          {preset === 'Custom' ? (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={custom.from}
                max={custom.to}
                onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))}
                className="rounded-lg border border-af-border px-2 py-1 text-xs text-gray-700"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={custom.to}
                min={custom.from}
                max={TODAY}
                onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))}
                className="rounded-lg border border-af-border px-2 py-1 text-xs text-gray-700"
              />
            </div>
          ) : (
            <p className="text-[11px] text-slate-400">
              {range.label} · {range.from} → {range.to}
            </p>
          )}
        </div>
      </div>

      {/* ---------- the six widgets ---------- */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((w) => (
          <WidgetTile
            key={w.key}
            widget={w}
            active={drill?.title === w.label}
            onClick={() => openDrill(w.key, w.label)}
          />
        ))}
      </div>

      {/* ---------- 1. Platform Activity · 2. Lead Distribution by Product ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          className="lg:col-span-2"
          title="Platform Activity"
          subtitle={`Funnel by month · last ${activity.length} month${activity.length === 1 ? '' : 's'} · ${yearConversion}% conversion`}
          icon={TrendingUp}
          kind="series"
          data={activity}
          xKey="month"
          xLabel="Month"
          series={FUNNEL_SERIES}
          height={230}
          types={['line', 'area', 'bar', 'stacked', 'table']}
          defaultType="line"
          nestedAreas
          tooltipExtra={(row) => `Conversion ${row.conversion}% · ${row.disbursed} of ${row.leads} disbursed`}
          extraColumns={[CONVERSION_COLUMN]}
          onDrill={drillActivity}
          drillHint="Click a month to see that month's leads"
        />
        <ChartCard
          title="Lead Distribution by Product"
          subtitle={`${products.length} products in this slice`}
          icon={Layers}
          kind="share"
          data={products}
          nameKey="name"
          valueKey="value"
          xLabel="Product"
          height={230}
          types={['hbar', 'donut', 'table']}
          defaultType="hbar"
          colors={ordinalSteps(products.length)}
          onDrill={drillProduct}
          drillHint="Click a product to list its leads"
        />
      </div>

      {/* ---------- 3. Campaigns · 4. Ageing Leads ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Panel title="Campaigns" icon={Zap} count={campaigns.length}>
          {campaigns.length === 0 ? (
            <Empty>No campaign activity in this period</Empty>
          ) : (
            <div className="max-h-[320px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-af-bg">
                  <tr className="border-b border-af-border">
                    {['Campaign', 'Source', 'Leads', 'Contacted', 'Disbursed', 'Rejected', 'Disbursal to Lead Ratio', 'Value'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campaignPage.pageRows.map((c) => (
                    <tr key={c.campaignId} className="tbl-row">
                      <td className="px-3 py-2">
                        <p className="text-xs font-semibold text-gray-800">{c.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {c.channel}
                          {c.active ? ' · live' : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2 text-[11px] text-slate-500">{c.source}</td>
                      <td className="px-3 py-2 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.leads}</td>
                      <td className="px-3 py-2 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.contacted}</td>
                      <td className="px-3 py-2 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.disbursed}</td>
                      <td className="px-3 py-2 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>{c.rejected}</td>
                      <td className="px-3 py-2 text-xs font-bold" style={{ color: CATEGORICAL[0] }}>{c.disbursalRate}%</td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-700">{formatINR(c.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {campaigns.length > 0 && <Pagination {...campaignPage.props} noun="campaigns" compact />}
        </Panel>

        <ChartCard
          title="Ageing Leads"
          subtitle={`Open leads by days in status · breach at ${AGEING_DAYS} days`}
          icon={CalendarClock}
          kind="share"
          data={ageing.map((b) => ({ name: b.label, value: b.count, breached: b.breached }))}
          nameKey="name"
          valueKey="value"
          xLabel="Bucket"
          height={210}
          types={['hbar', 'table']}
          defaultType="hbar"
          colors={ordinalSteps(ageing.length)}
          onDrill={drillAgeing}
          drillHint="Click a bucket to see the aged leads"
        />
      </div>

      {/* ---------- 7. Team Productivity · 6. Overdue Follow-ups ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title="Team Productivity" icon={Users} count={team.length}>
          {team.length === 0 ? (
            <Empty>No one reports to you in this view</Empty>
          ) : (
            <>
            {/* MOM 8 Sep: the agreed measure for this component is disbursement
                over total manpower in the team. */}
            <div className="flex flex-wrap items-end gap-6 border-b border-af-border px-4 py-3">
              <div>
                <p className="text-2xl font-bold leading-none text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {teamStat.perHead}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">
                  disbursals per head · {teamStat.disbursed} across {teamStat.headcount} DST
                  {teamStat.headcount === 1 ? '' : 's'}
                </p>
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-[#861D3F]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {formatINR(teamStat.valuePerHead)}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">disbursed value per head</p>
              </div>
              <div>
                <p className="text-sm font-bold leading-none text-slate-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {teamStat.active} / {teamStat.headcount}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">carrying leads</p>
              </div>
            </div>
            <div className="max-h-[340px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-af-bg">
                  <tr className="border-b border-af-border">
                    {['Name', 'Leads', 'Open', 'Contacted', 'Qualified', 'Disbursed', 'Conv %', 'Aged', 'Value'].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2 text-left text-[11px] font-semibold text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {teamPage.pageRows.map((r) => (
                    <tr
                      key={r.id}
                      className="tbl-row cursor-pointer"
                      onClick={() => setDrill({ title: `${r.name} — ${r.role}`, leads: book.filter((l) => l.assignedTo === r.id), subtitle: 'Team Productivity' })}
                    >
                      <td className="px-3 py-2">
                        <p className="text-xs font-semibold text-gray-800">{r.name}</p>
                        <p className="text-[10px] text-slate-400">{r.branch}</p>
                      </td>
                      {[r.leads, r.open, r.contacted, r.qualified, r.disbursed].map((v, i) => (
                        <td key={i} className="px-3 py-2 text-xs text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {v}
                        </td>
                      ))}
                      <td className="px-3 py-2 text-xs font-bold" style={{ color: CATEGORICAL[0], fontVariantNumeric: 'tabular-nums' }}>
                        {r.convRate}%
                      </td>
                      <td className="px-3 py-2">
                        {r.aged > 0 ? (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">{r.aged}</span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-xs font-semibold text-slate-700">{formatINR(r.value)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </>
          )}
          {team.length > 0 && <Pagination {...teamPage.props} noun="people" compact />}
        </Panel>

        <Panel
          title="Overdue Follow-ups"
          icon={AlertTriangle}
          count={overdue.length}
          tone={overdue.length ? 'critical' : undefined}
        >
          {overdue.length === 0 ? (
            <Empty>Nothing overdue — every follow-up is on time</Empty>
          ) : (
            <div className="max-h-[340px] divide-y divide-af-border/50 overflow-auto">
              {overdue.slice(0, 20).map((l) => (
                <button
                  key={l.leadId}
                  onClick={() => setDrill({ title: 'Overdue follow-ups', leads: overdue, subtitle: `${overdue.length} overdue` })}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-af-bg"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">
                      {l.firstName} {l.lastName}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {l.assignedToName} · due {l.nextFollowUpDate}
                    </p>
                  </div>
                  <span className="flex-shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                    {l.daysOverdue}d late
                  </span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* ---------- 9. SLA Compliance · 8. Data Quality · 5. Unallocated Leads ---------- */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="SLA Compliance" icon={ShieldCheck}>
          <div className="p-4">
            <div className="mb-4 flex items-end justify-between">
              <div>
                <p className="text-3xl font-bold leading-none text-slate-800">{sla.compliance}%</p>
                <p className="mt-1 text-xs text-slate-400">
                  actioned within the {AGEING_DAYS}-day rule
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-slate-700">{sla.avgResponseHours}h</p>
                <p className="text-[10px] text-slate-400">avg first response</p>
              </div>
            </div>
            <div className="mb-3 h-2.5 overflow-hidden rounded-full" style={{ background: ORDINAL_MAROON[0] + '55' }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${sla.compliance}%`,
                  background: sla.compliance < 70 ? STATUS.critical : ORDINAL_MAROON[4],
                }}
              />
            </div>
            <div className="space-y-1.5">
              {sla.buckets.map((b, i) => {
                const total = sla.buckets.reduce((s, x) => s + x.count, 0) || 1
                return (
                  <div key={b.label} className="flex items-center gap-2.5">
                    <span className="w-24 flex-shrink-0 text-[11px] text-slate-500">{b.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(b.count / total) * 100}%`, background: ordinalSteps(4)[i] }}
                      />
                    </div>
                    <span className="w-9 flex-shrink-0 text-right text-[11px] font-semibold text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {b.count}
                    </span>
                  </div>
                )
              })}
            </div>
            {sla.breaches > 0 && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-red-600">
                <AlertTriangle size={11} /> {sla.breaches} lead{sla.breaches === 1 ? '' : 's'} breaching
              </p>
            )}
          </div>
        </Panel>

        <ChartCard
          title="Data Quality by Reason"
          subtitle="Why leads did not convert"
          icon={Database}
          kind="share"
          data={dq.slice(0, 8)}
          nameKey="name"
          valueKey="value"
          xLabel="Reason"
          height={210}
          types={['hbar', 'donut', 'table']}
          defaultType="hbar"
          colors={ordinalSteps(Math.min(dq.length, 8))}
          onDrill={drillReason}
          drillHint="Click a reason to see those leads"
        />

        <Panel
          title="Unallocated Leads"
          icon={MapPinOff}
          count={unalloc.length}
          tone={unalloc.length ? 'critical' : undefined}
        >
          {unalloc.length === 0 ? (
            <Empty>Every lead is allocated</Empty>
          ) : (
            <>
              {/* MOM 8 Sep: keep the single-row Assign and add mass multi-select. */}
              {mayAssign && (
                <div className="flex flex-wrap items-center gap-2 border-b border-af-border bg-af-bg px-4 py-2">
                  <label className="flex items-center gap-2 text-[11px] text-slate-500">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-[#861D3F]"
                      checked={picked.size > 0 && picked.size === unalloc.length}
                      ref={(el) => { if (el) el.indeterminate = picked.size > 0 && picked.size < unalloc.length }}
                      onChange={(e) =>
                        setPicked(e.target.checked ? new Set(unalloc.map((l) => l.leadId)) : new Set())
                      }
                    />
                    Select all ({unalloc.length})
                  </label>
                  <span className="text-[11px] text-slate-400">
                    {picked.size ? `${picked.size} selected` : `${unalloc.length} unallocated`}
                  </span>
                  <button
                    type="button"
                    disabled={!picked.size}
                    onClick={() => setAssignMany(true)}
                    className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#861D3F] px-2.5 py-1 text-[11px] font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Users size={12} /> Assign selected
                  </button>
                </div>
              )}
              {flash && (
                <p className="flex items-center gap-1.5 border-b border-af-border bg-emerald-50 px-4 py-2 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 size={12} /> {flash}
                </p>
              )}
              <div className="max-h-[320px] divide-y divide-af-border/50 overflow-auto">
                {unallocPage.pageRows.map((l) => (
                  <div key={l.leadId} className="flex items-start gap-2.5 px-4 py-3">
                    {mayAssign && (
                      <input
                        type="checkbox"
                        aria-label={`Select ${l.firstName} ${l.lastName}`}
                        className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-[#861D3F]"
                        checked={picked.has(l.leadId)}
                        onChange={() => togglePick(l.leadId)}
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => setDrill({ title: 'Unallocated lead', leads: [l], subtitle: `Rule ${l.assignmentRuleNo} · ${l.parkedReason}` })}
                      className="min-w-0 flex-1 text-left"
                    >
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-semibold text-gray-800">
                          {l.firstName} {l.lastName}
                        </span>
                        <ProductBadge product={l.product} />
                      </span>
                      <span className="mt-0.5 block text-[11px] text-amber-700">
                        Rule {l.assignmentRuleNo} · {l.parkedReason}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        Pincode {l.pincode} · held by {l.parkedWithName || 'nobody'}{' '}
                        {l.parkedWithRole ? `(${l.parkedWithRole})` : ''}
                      </span>
                    </button>
                    {mayAssign && (
                      <button
                        type="button"
                        onClick={() => setAssignOne(l)}
                        className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-af-border px-2 py-1 text-[10px] font-semibold text-slate-500 transition-colors hover:border-[#861D3F]/40 hover:text-[#861D3F]"
                      >
                        <ArrowLeftRight size={11} /> Assign
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <Pagination {...unallocPage.props} noun="leads" compact />
            </>
          )}
        </Panel>
      </div>

      {assignOne && (
        <ReassignLeadModal
          lead={assignOne}
          currentUser={currentUser}
          onClose={() => setAssignOne(null)}
          onDone={(res) =>
            setFlash(`${res.lead.firstName} ${res.lead.lastName} assigned to ${res.to?.name || 'the selected user'}.`)
          }
        />
      )}

      {assignMany && (
        <BulkAssignModal
          leads={pickedLeads}
          currentUser={currentUser}
          onClose={() => setAssignMany(false)}
          onDone={({ count, toName }) => {
            setPicked(new Set())
            setFlash(`${count} lead${count === 1 ? '' : 's'} assigned to ${toName}. Each one is logged separately.`)
          }}
        />
      )}

      {userDrill && <UserListDrawer users={userDrill} onClose={() => setUserDrill(null)} />}

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

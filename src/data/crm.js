// ---------------------------------------------------------------------------
// The CRM access layer the screens read from.
//
// Rules of the house:
//   1. Every figure is DERIVED from the lead book at runtime, so a widget and
//      the list behind it can never disagree.
//   2. Nothing reaches a screen without passing through visibleLeads(), so
//      hierarchy scoping is structural rather than remembered.
//   3. Date range scopes everything below it (MOM: MTD / QTD / YTD + custom).
// ---------------------------------------------------------------------------
import { LEADS as BASELINE_LEADS } from './generated/leads.js'
import { USERS } from './generated/org.js'
import { getAllLeadsEver, getLeads, storeVersion } from '../logic/leadStore.js'
import { CAMPAIGNS } from './generated/campaigns.js'
import { BRANCHES, resolvePincode } from './geography.js'
import { PRODUCTS, REASONS } from './masters.js'
import { ROLES, can } from '../config/roles.js'
import { visibleLeads, visibleUsers, subordinates, directReports, scopeDescription } from '../logic/visibility.js'
import {
  AGEING_BUCKETS, AGEING_DAYS, OPEN_STATUSES, ageDays, ageingProfile, daysInStatus,
  isFollowUpDueToday, isOpen, isOverdueFollowUp, isUntouched,
} from '../logic/ageing.js'

/**
 * The live lead book. Reads go through the store so a lead created, edited,
 * re-assigned or deleted in session is reflected on every screen at once.
 * `BASELINE_LEADS` is the untouched generated dataset, kept for reference.
 */
export { BASELINE_LEADS, USERS, CAMPAIGNS, BRANCHES, resolvePincode, scopeDescription, subordinates, directReports }
export { getLeads }

/** Governance: archive after 2 years (retrievable), purge rejected at 60 days. */
export const ARCHIVE_YEARS = 2
export const REJECTED_PURGE_DAYS = 60

const daysSince = (dateStr) =>
  Math.floor((new Date(`${TODAY_ANCHOR}`) - new Date(dateStr)) / 86400000)

export const isArchived = (lead) => daysSince(lead.leadCreatedDate) > ARCHIVE_YEARS * 365

/**
 * "Rejected leads drop out of the All Leads view and purge at 60 days."
 * Purged rows leave every working view; they remain in the audit trail and can
 * still be reached through the archive filter.
 */
export const isPurged = (lead) =>
  lead.leadStatus === 'Rejected' && daysSince(lead.statusUpdatedOn || lead.leadCreatedDate) > REJECTED_PURGE_DAYS

/** The working book: what the app should show by default. */
export function liveLeads() {
  return getLeads().filter((l) => !isArchived(l) && !isPurged(l))
}

export const archivedLeads = () => getLeads().filter((l) => isArchived(l) || isPurged(l))
export { AGEING_DAYS, OPEN_STATUSES, AGEING_BUCKETS, isOpen }

/** The demo "today". Kept in step with the generator's CONFIG.today. */
export const TODAY = '2026-09-10'
const TODAY_ANCHOR = `${TODAY}T23:59:59`
const todayDate = new Date(TODAY_ANCHOR)

export const usersById = Object.fromEntries(USERS.map((u) => [u.id, u]))
export const getUser = (id) => usersById[id]

// ------------------------------------------------------------- date ranges
const fyStart = (d) => {
  // Indian financial year starts 1 April.
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return new Date(y, 3, 1)
}
const quarterStart = (d) => {
  // Fiscal quarters: Apr–Jun, Jul–Sep, Oct–Dec, Jan–Mar.
  const fy = fyStart(d)
  const monthsIn = (d.getFullYear() - fy.getFullYear()) * 12 + (d.getMonth() - fy.getMonth())
  return new Date(fy.getFullYear(), fy.getMonth() + Math.floor(monthsIn / 3) * 3, 1)
}
// Format from LOCAL parts. toISOString() converts to UTC, which in IST (+5:30)
// turns local midnight into the previous day and shifted every range start back
// by one day.
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

export const RANGE_PRESETS = ['MTD', 'QTD', 'YTD', 'Custom']

export function resolveRange(preset, custom = {}) {
  const end = TODAY
  if (preset === 'Custom' && custom.from && custom.to) {
    return { from: custom.from, to: custom.to, label: `${custom.from} → ${custom.to}`, preset }
  }
  if (preset === 'QTD') {
    const s = quarterStart(todayDate)
    return { from: iso(s), to: end, label: 'Quarter to date', preset }
  }
  if (preset === 'YTD') {
    const s = fyStart(todayDate)
    return { from: iso(s), to: end, label: `FY to date (from ${iso(s)})`, preset }
  }
  const s = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1)
  return { from: iso(s), to: end, label: 'Month to date', preset: 'MTD' }
}

/**
 * Milestone dates, read off each lead's timeline.
 *
 * This matters for the dashboard: "Disbursed" in MTD must mean "disbursed DURING
 * this month", not "leads created this month that have since disbursed". Filtering
 * everything by creation date reported 0% MTD disbursal, which is a cohort figure
 * masquerading as a monthly result.
 */
const MILESTONE_ACTIONS = {
  contactedOn: 'Customer Contacted',
  loginOn: 'Status → Login Initiated',
  sanctionedOn: 'Status → Sanctioned',
  disbursedOn: 'Status → Disbursed',
  rejectedOn: 'Status → Rejected',
}

const milestoneCache = new Map()
export function milestones(lead) {
  if (milestoneCache.has(lead.leadId)) return milestoneCache.get(lead.leadId)
  const out = {}
  for (const entry of lead.timeline || []) {
    for (const [key, action] of Object.entries(MILESTONE_ACTIONS)) {
      if (!out[key] && entry.action === action) out[key] = entry.ts.slice(0, 10)
    }
  }
  milestoneCache.set(lead.leadId, out)
  return out
}

/** Did `milestone` happen inside the range? */
export const milestoneInRange = (lead, key, range) => {
  const d = milestones(lead)[key]
  return Boolean(d) && d >= range.from && d <= range.to
}

export const inRange = (lead, range) => {
  const d = lead.leadCreatedDate.slice(0, 10)
  return d >= range.from && d <= range.to
}

/** The one entry point: role-scoped, then date-scoped. */
export function scopedLeads(user, range, { includeArchived = false } = {}) {
  const book = includeArchived ? getLeads() : liveLeads()
  const visible = visibleLeads(user, book)
  return range ? visible.filter((l) => inRange(l, range)) : visible
}

// -------------------------------------------------------------- primitives
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0)
const pct = (n, d) => (d ? +((n / d) * 100).toFixed(1) : 0)
const countBy = (a, f) => a.reduce((m, x) => { const k = f(x); m[k] = (m[k] || 0) + 1; return m }, {})

export const CONTACTED = ['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed']
export const QUALIFIED = ['Sanctioned', 'Disbursed']

// ------------------------------------------------- the six dashboard widgets
/**
 * MOM: "Six widgets were agreed covering Users, Open Leads, Contacted,
 * Untouched, Qualified and Disbursed."
 */
export function widgets(user, range) {
  // STOCK metrics describe the book as it stands today and are not date-filtered.
  // FLOW metrics count what happened inside the selected range.
  const book = visibleLeads(user, liveLeads())
  const scopeUsers = visibleUsers(user, USERS)
  const activeUsers = scopeUsers.filter((u) => u.status !== 'Inactive')
  const logins = loginActivity()
  const neverLoggedIn = scopeUsers.filter(
    (u) => !logins.find((l) => l.id === u.id)?.lastLogin,
  ).length

  const open = book.filter(isOpen)
  const untouched = book.filter((l) => isUntouched(l, TODAY))

  const received = book.filter((l) => inRange(l, range))
  const contacted = book.filter((l) => milestoneInRange(l, 'contactedOn', range))
  const qualified = book.filter((l) => milestoneInRange(l, 'sanctionedOn', range))
  const disbursed = book.filter((l) => milestoneInRange(l, 'disbursedOn', range))

  return [
    {
      key: 'users', label: 'Users', kind: 'stock',
      // Users, not leads: the count of people who can sign in within this
      // person's scope. Central roles have nobody reporting to them, so
      // counting subordinates used to read 0 for HO, Product Team and the
      // Super User — the very roles that see everything.
      entity: 'users',
      value: activeUsers.length,
      sub:
        user.role === 'DST'
          ? 'Just you'
          : `${neverLoggedIn} never signed in · ${scopeUsers.length - activeUsers.length} inactive`,
      detail: 'active user accounts you can see',
    },
    {
      key: 'openLeads', label: 'Open Leads', kind: 'stock',
      value: open.length,
      sub: `${pct(open.length, book.length)}% of your book`,
      detail: 'still being worked, as of today',
    },
    {
      key: 'contacted', label: 'Contacted', kind: 'flow',
      value: contacted.length,
      sub: received.length ? `${pct(contacted.length, received.length)}% of leads received` : '—',
      detail: 'first contact made in this period',
    },
    {
      key: 'untouched', label: 'Untouched', kind: 'stock',
      value: untouched.length,
      sub: `New beyond ${AGEING_DAYS} days`,
      detail: 'breaching the ageing rule right now',
      tone: untouched.length ? 'critical' : 'good',
    },
    {
      key: 'qualified', label: 'Qualified', kind: 'flow',
      value: qualified.length,
      sub: 'Sanctioned in this period',
      detail: 'reached Sanctioned',
    },
    {
      key: 'disbursed', label: 'Disbursed', kind: 'flow',
      value: disbursed.length,
      sub: formatINR(sum(disbursed, (l) => l.offerAmount)),
      detail: 'funded in this period',
      tone: 'good',
    },
  ]
}

/** The users behind the Users tile — it drills to people, not leads. */
export function widgetUsers(user) {
  const rows = visibleUsers(user, USERS)
  const logins = loginActivity()
  return rows
    .map((u) => ({ ...u, login: logins.find((l) => l.id === u.id) || null }))
    .sort((a, b) => (b.login?.lastLogin || '').localeCompare(a.login?.lastLogin || ''))
}

/** Leads behind a widget, so every tile can drill through to its own list. */
export function widgetLeads(user, range, key) {
  const book = visibleLeads(user, liveLeads())
  switch (key) {
    case 'openLeads': return book.filter(isOpen)
    case 'untouched': return book.filter((l) => isUntouched(l, TODAY))
    case 'contacted': return book.filter((l) => milestoneInRange(l, 'contactedOn', range))
    case 'qualified': return book.filter((l) => milestoneInRange(l, 'sanctionedOn', range))
    case 'disbursed': return book.filter((l) => milestoneInRange(l, 'disbursedOn', range))
    // 'users' is not a lead metric; the caller must use widgetUsers().
    case 'users': return []
    default: return book.filter((l) => inRange(l, range))
  }
}

// ------------------------------------------------ the nine dashboard components
const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const monthKey = (label) => {
  const [a, y] = label.split(' ')
  return Number(y) * 12 + MONTH_ABBR.indexOf(a)
}

/**
 * 1. Platform Activity — the funnel month by month.
 *
 * MOM 8 Sep: yearly, not six months, with Sanctioned as its own stage and a
 * conversion percentage. Counts are cumulative-reach — a disbursed lead also
 * counts as contacted, logged in and sanctioned — so the stages descend like a
 * funnel instead of being mutually exclusive buckets.
 */
export function platformActivity(leads, { months: window = 12 } = {}) {
  const months = [...new Set(leads.map((l) => l.monthLabel))].sort((a, b) => monthKey(a) - monthKey(b))
  const recent = window ? months.slice(-window) : months
  return recent.map((label) => {
    const slice = leads.filter((l) => l.monthLabel === label)
    const disbursed = slice.filter((l) => l.leadStatus === 'Disbursed').length
    return {
      month: label.split(' ')[0],
      monthLabel: label,
      leads: slice.length,
      contacted: slice.filter((l) => CONTACTED.includes(l.leadStatus)).length,
      loggedIn: slice.filter((l) => ['Login Initiated', ...QUALIFIED].includes(l.leadStatus)).length,
      sanctioned: slice.filter((l) => QUALIFIED.includes(l.leadStatus)).length,
      disbursed,
      conversion: pct(disbursed, slice.length),
    }
  })
}

/** 2. Lead Distribution by Product. */
export function leadsByProduct(leads, limit = 8) {
  const rows = Object.entries(countBy(leads, (l) => l.product))
    .map(([name, value]) => ({ name, value, portfolio: PRODUCTS.find((p) => p.name === name)?.portfolio }))
    .sort((a, b) => b.value - a.value)
  if (rows.length <= limit) return rows
  // Never generate more hues — fold the tail into "Other".
  const head = rows.slice(0, limit - 1)
  const tail = rows.slice(limit - 1)
  return [...head, { name: `Other (${tail.length} products)`, value: sum(tail, (r) => r.value) }]
}

export function leadsByPortfolio(leads) {
  return Object.entries(countBy(leads, (l) => l.portfolio))
    .map(([name, value]) => ({ name, value, pct: pct(value, leads.length) }))
    .sort((a, b) => b.value - a.value)
}

/** 3. Campaigns. */
export function campaignPerformance(leads) {
  const ids = [...new Set(leads.map((l) => l.campaignId))]
  return ids
    .map((id) => {
      const c = CAMPAIGNS.find((x) => x.campaignId === id)
      const slice = leads.filter((l) => l.campaignId === id)
      const disbursed = slice.filter((l) => l.leadStatus === 'Disbursed')
      const value = sum(disbursed, (l) => l.offerAmount)
      return {
        campaignId: id,
        name: c?.campaignName || id,
        theme: c?.theme,
        source: c?.source,
        channel: c?.channel,
        active: c?.active,
        budget: c?.budget || 0,
        leads: slice.length,
        contacted: slice.filter((l) => CONTACTED.includes(l.leadStatus)).length,
        disbursed: disbursed.length,
        // MOM 8 Sep: Rejected and the disbursal-to-lead ratio sit after
        // Disbursed; Spend and DQ Rate came off the table.
        rejected: slice.filter((l) => l.leadStatus === 'Rejected').length,
        disbursalRate: pct(disbursed.length, slice.length),
        value,
        costPerLead: slice.length ? Math.round((c?.budget || 0) / slice.length) : 0,
        roi: c?.budget ? +(value / c.budget).toFixed(1) : 0,
      }
    })
    .sort((a, b) => b.leads - a.leads)
}

/**
 * 4. Ageing Leads — ordered buckets against the 3-day rule.
 *
 * The bucket definition and the drill-through share ONE implementation, so a
 * bar's height can never disagree with the rows behind it.
 */
export const daysAged = (lead) => daysInStatus(lead, TODAY)

export const ageingLeads = (leads) => ageingProfile(leads, TODAY)

export function ageingBucketLeads(leads, bucketLabel) {
  const bucket = AGEING_BUCKETS.find((b) => b.label === bucketLabel)
  if (!bucket) return []
  return leads.filter((l) => {
    if (!isOpen(l)) return false
    const d = daysAged(l)
    return d >= bucket.min && d <= bucket.max
  })
}

/** 5. Unallocated Leads — rule 3 parks these with the Zonal Head. */
export function unallocatedLeads(leads) {
  return leads
    .filter((l) => l.isUnallocated || l.assignmentOutcome !== 'assigned')
    .map((l) => ({
      ...l,
      parkedWithName: l.parkedWith ? usersById[l.parkedWith]?.name : null,
      parkedWithRole: l.parkedWith ? usersById[l.parkedWith]?.role : null,
    }))
    .sort((a, b) => b.leadCreatedDate.localeCompare(a.leadCreatedDate))
}

/** 6. Overdue Follow-ups. */
export function overdueFollowUps(leads) {
  return leads
    .filter((l) => isOverdueFollowUp(l, TODAY))
    .map((l) => ({ ...l, daysOverdue: Math.max(1, ageDays({ leadCreatedDate: `${l.nextFollowUpDate}T00:00:00` }, TODAY)) }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue)
}

export const followUpsDueToday = (leads) => leads.filter((l) => isFollowUpDueToday(l, TODAY))

/** 7. Team Productivity — one row per person reporting to this user. */
export function teamProductivity(user, leads) {
  const team = user.role === 'DST' ? [user] : subordinates(user, USERS).filter((u) => u.role === 'DST')
  return team
    .map((u) => {
      const own = leads.filter((l) => l.assignedTo === u.id)
      const disbursed = own.filter((l) => l.leadStatus === 'Disbursed')
      const responded = own.filter((l) => l.firstResponseHours != null)
      const aged = own.filter((l) => isOpen(l) && daysAged(l) >= AGEING_DAYS)
      return {
        id: u.id,
        name: u.name,
        role: u.role,
        branch: u.branch,
        status: u.status,
        leads: own.length,
        open: own.filter(isOpen).length,
        contacted: own.filter((l) => CONTACTED.includes(l.leadStatus)).length,
        qualified: own.filter((l) => QUALIFIED.includes(l.leadStatus)).length,
        disbursed: disbursed.length,
        convRate: pct(disbursed.length, own.length),
        value: sum(disbursed, (l) => l.offerAmount),
        aged: aged.length,
        avgResponseHours: responded.length ? +(sum(responded, (l) => l.firstResponseHours) / responded.length).toFixed(1) : null,
      }
    })
    .filter((r) => r.leads > 0)
    .sort((a, b) => b.disbursed - a.disbursed || b.convRate - a.convRate)
}

/**
 * The headline the MOM asked for on this component: disbursement over total
 * manpower in the team. Headcount is every DST reporting in, including the ones
 * holding no leads — leaving them out would flatter the ratio.
 */
export function teamProductivityHeadline(user, leads) {
  const headcount =
    user.role === 'DST' ? 1 : subordinates(user, USERS).filter((u) => u.role === 'DST').length
  const rows = teamProductivity(user, leads)
  const disbursed = sum(rows, (r) => r.disbursed)
  const value = sum(rows, (r) => r.value)
  return {
    headcount,
    disbursed,
    value,
    perHead: headcount ? +(disbursed / headcount).toFixed(2) : 0,
    valuePerHead: headcount ? Math.round(value / headcount) : 0,
    active: rows.length,
  }
}

/** 8. Data Quality by Reason — why leads die. */
export function dataQualityByReason(leads, statuses = ['Rejected', 'Not interested', 'Not reachable', 'Duplicate']) {
  const slice = leads.filter((l) => statuses.includes(l.leadStatus) && l.reasonCode)
  const rows = Object.entries(countBy(slice, (l) => l.reasonCode)).map(([code, count]) => ({
    code,
    name: REASONS.find((r) => r.code === code)?.label || code,
    value: count,
    pct: pct(count, slice.length),
  }))
  return rows.sort((a, b) => b.value - a.value)
}

/**
 * 9. SLA Compliance. AFL's only stated threshold is the 3-day ageing rule, so
 * compliance is measured against that rather than the mockup's invented 2-hour
 * SLA. Flagged for AFL: confirm whether a tighter first-response SLA applies.
 */
export function slaCompliance(leads) {
  const actionable = leads.filter((l) => l.assignedTo)
  const withinRule = actionable.filter((l) => !l.slaBreached).length
  const responded = actionable.filter((l) => l.firstResponseHours != null)
  const buckets = [
    { label: 'Within 2 hrs', count: responded.filter((l) => l.firstResponseHours <= 2).length },
    { label: '2 – 24 hrs', count: responded.filter((l) => l.firstResponseHours > 2 && l.firstResponseHours <= 24).length },
    { label: '1 – 3 days', count: responded.filter((l) => l.firstResponseHours > 24 && l.firstResponseHours <= AGEING_DAYS * 24).length },
    { label: `Beyond ${AGEING_DAYS} days`, count: responded.filter((l) => l.firstResponseHours > AGEING_DAYS * 24).length },
  ]
  return {
    compliance: pct(withinRule, actionable.length),
    breaches: actionable.length - withinRule,
    avgResponseHours: responded.length ? +(sum(responded, (l) => l.firstResponseHours) / responded.length).toFixed(1) : 0,
    buckets,
    byMonth: platformActivity(leads).map((m) => {
      const slice = leads.filter((l) => l.monthLabel === m.monthLabel && l.assignedTo)
      return { month: m.month, monthLabel: m.monthLabel, compliance: pct(slice.filter((l) => !l.slaBreached).length, slice.length) }
    }),
  }
}

/** Headline roll-up used by the analytics reports and the dashboard header. */
export function summarise(leads) {
  const disbursed = leads.filter((l) => l.leadStatus === 'Disbursed')
  const contacted = leads.filter((l) => CONTACTED.includes(l.leadStatus))
  const qualified = leads.filter((l) => QUALIFIED.includes(l.leadStatus))
  return {
    total: leads.length,
    open: leads.filter(isOpen).length,
    contacted: contacted.length,
    contactRate: pct(contacted.length, leads.length),
    qualified: qualified.length,
    qualifiedRate: pct(qualified.length, leads.length),
    disbursed: disbursed.length,
    disbursalRate: pct(disbursed.length, leads.length),
    offerValue: sum(leads, (l) => l.offerAmount),
    disbursedValue: sum(disbursed, (l) => l.offerAmount),
    untouched: leads.filter((l) => isUntouched(l, TODAY)).length,
    overdue: leads.filter((l) => isOverdueFollowUp(l, TODAY)).length,
    unallocated: leads.filter((l) => l.isUnallocated).length,
    duplicates: leads.filter((l) => l.duplicateFlag === 'Yes').length,
  }
}

export function formatINR(n) {
  if (n == null) return '—'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${n}`
}

export { can, ROLES }

// ---------------------------------------------------------------------------
// Analytics — the two confirmed reports. Both are region-wise, with a
// report-till-date and a custom date filter. Conversion Funnel and Campaign
// Performance were dropped from analytics; Data Quality by Reason and SLA
// Compliance moved onto the dashboard.
// ---------------------------------------------------------------------------

/** Report till date: everything from the start of the book up to `to`. */
export function resolveReportRange(mode, custom = {}) {
  if (mode === 'Custom' && custom.from && custom.to) {
    return { from: custom.from, to: custom.to, label: `${custom.from} → ${custom.to}`, mode }
  }
  const book = liveLeads()
  const earliest = book.reduce((min, l) => (l.leadCreatedDate < min ? l.leadCreatedDate : min), book[0]?.leadCreatedDate || `${TODAY}T00:00:00`)
  return { from: earliest.slice(0, 10), to: custom.to || TODAY, label: `Report till ${custom.to || TODAY}`, mode: 'RTD' }
}

const reportMetrics = (slice) => {
  const contacted = slice.filter((l) => CONTACTED.includes(l.leadStatus))
  const login = slice.filter((l) => ['Login Initiated', ...QUALIFIED].includes(l.leadStatus))
  const qualified = slice.filter((l) => QUALIFIED.includes(l.leadStatus))
  const disbursed = slice.filter((l) => l.leadStatus === 'Disbursed')
  const rejected = slice.filter((l) => ['Rejected', 'Not interested'].includes(l.leadStatus))
  const actionable = slice.filter((l) => l.assignedTo)
  return {
    leads: slice.length,
    contacted: contacted.length,
    contactRate: pct(contacted.length, slice.length),
    loginInitiated: login.length,
    qualified: qualified.length,
    disbursed: disbursed.length,
    disbursalRate: pct(disbursed.length, slice.length),
    rejected: rejected.length,
    dqRate: pct(rejected.length, slice.length),
    value: sum(disbursed, (l) => l.offerAmount),
    avgTicket: disbursed.length ? Math.round(sum(disbursed, (l) => l.offerAmount) / disbursed.length) : 0,
    slaCompliance: pct(actionable.filter((l) => !l.slaBreached).length, actionable.length),
  }
}

/**
 * Master Report — one row per region, with the zone it sits in, so a national
 * reader can roll up and a regional reader sees only their own row.
 */
export function masterReport(leads) {
  const keys = [...new Set(leads.map((l) => l.region).filter(Boolean))]
  const rows = keys
    .map((region) => {
      const slice = leads.filter((l) => l.region === region)
      return { region, zone: slice[0]?.zone, branches: new Set(slice.map((l) => l.branchCode)).size, ...reportMetrics(slice) }
    })
    .sort((a, b) => b.leads - a.leads)

  const unmapped = leads.filter((l) => !l.region)
  if (unmapped.length) {
    rows.push({ region: 'Unmapped / OGL', zone: '—', branches: 0, ...reportMetrics(unmapped) })
  }
  return { rows, total: { region: 'Total', zone: '', branches: new Set(leads.map((l) => l.branchCode)).size, ...reportMetrics(leads) } }
}

/** Zone roll-up, for the national roles. */
export function zoneReport(leads) {
  const keys = [...new Set(leads.map((l) => l.zone).filter(Boolean))]
  return keys
    .map((zone) => {
      const slice = leads.filter((l) => l.zone === zone)
      return { zone, regions: new Set(slice.map((l) => l.region)).size, ...reportMetrics(slice) }
    })
    .sort((a, b) => b.leads - a.leads)
}

/** Product Wise Report — one row per product, optionally within a region. */
export function productReport(leads, region = 'all') {
  const scoped = region === 'all' ? leads : leads.filter((l) => l.region === region)
  const keys = [...new Set(scoped.map((l) => l.product))]
  const rows = keys
    .map((product) => {
      const slice = scoped.filter((l) => l.product === product)
      return { product, portfolio: slice[0]?.portfolio, ...reportMetrics(slice) }
    })
    .sort((a, b) => b.leads - a.leads)
  return { rows, total: { product: 'Total', portfolio: '', ...reportMetrics(scoped) }, scoped }
}

/** Portfolio roll-up of the product report. */
export function portfolioReport(leads) {
  const keys = [...new Set(leads.map((l) => l.portfolio))]
  return keys
    .map((portfolio) => {
      const slice = leads.filter((l) => l.portfolio === portfolio)
      return { portfolio, products: new Set(slice.map((l) => l.product)).size, ...reportMetrics(slice) }
    })
    .sort((a, b) => b.leads - a.leads)
}

export const regionsIn = (leads) => [...new Set(leads.map((l) => l.region).filter(Boolean))].sort()

// ---------------------------------------------------------------------------
// Tasks. The Input Sheet names exactly two automations — "Lead created" and
// "Follow-up" — so tasks are DERIVED from the lead book rather than being a
// separate invented dataset. That way a task can never reference a lead that
// does not exist, and the counts always reconcile.
// ---------------------------------------------------------------------------
import { TASK_AUTOMATIONS, autoTasksForLead } from '../config/taskFields.js'
import { sessionTasks as sessionTasksFromStore } from '../logic/leadStore.js'

export { TASK_AUTOMATIONS }

const deriveStatus = (task, lead) => {
  const ms = milestones(lead)
  if (task.automation === 'onLeadCreated') {
    // The first-contact call is done once contact was actually made.
    if (ms.contactedOn) return { status: 'Completed', completedOn: `${ms.contactedOn}T11:00:00`, callConnected: 'Connected' }
    if (lead.leadStatus === 'Not reachable') return { status: 'In Progress', completedOn: null, callConnected: 'Not Reachable' }
    if (['Rejected', 'Duplicate'].includes(lead.leadStatus)) return { status: 'Cancelled', completedOn: null, callConnected: null }
    return { status: 'Open', completedOn: null, callConnected: null }
  }
  // Follow-up task: open until its date passes and the lead leaves Follow-up.
  if (lead.leadStatus !== 'Follow-up') return { status: 'Completed', completedOn: lead.statusUpdatedOn, callConnected: 'Connected' }
  return { status: task.dueDate < TODAY ? 'Open' : 'Open', completedOn: null, callConnected: null }
}

const OUTCOMES = {
  Completed: 'Spoke with the customer and captured the next step.',
  'In Progress': 'Attempted — number not reachable. Retry scheduled.',
  Cancelled: 'Lead closed before the task could be actioned.',
}

const NEXT_ACTION_BY_STATUS = {
  'Follow-up': 'Follow-up Call',
  'Login Initiated': 'Send Documents',
  Sanctioned: 'Schedule Meeting',
  Disbursed: 'No Further Action',
  Rejected: 'Close Lead',
  'Not interested': 'Close Lead',
  'Not reachable': 'Follow-up Call',
}

let TASK_CACHE = null
let TASK_CACHE_VERSION = -1

/** Every task in the system, built from the two automations. */
export function allTasks() {
  if (TASK_CACHE && TASK_CACHE_VERSION === storeVersion()) return TASK_CACHE
  TASK_CACHE_VERSION = storeVersion()
  const out = []
  let seq = 1
  for (const lead of liveLeads()) {
    if (!lead.assignedTo) continue
    for (const base of autoTasksForLead(lead, { taskSeq: seq })) {
      seq += 1
      const derived = deriveStatus(base, lead)
      out.push({
        ...base,
        ...derived,
        assignedToName: usersById[lead.assignedTo]?.name || null,
        outcome: derived.status === 'Open' ? null : OUTCOMES[derived.status],
        nextAction: derived.status === 'Completed' ? NEXT_ACTION_BY_STATUS[lead.leadStatus] || null : null,
        nextFollowUpDate: lead.nextFollowUpDate,
        leadStatus: lead.leadStatus,
        leadStillOpen: OPEN_STATUSES.includes(lead.leadStatus),
        branchCode: lead.branchCode,
        smId: lead.smId,
        ahId: lead.ahId,
        rhId: lead.rhId,
        zhId: lead.zhId,
        overdue: derived.status === 'Open' && base.dueDate < TODAY,
      })
    }
  }
  // The derived generator recreates the follow-up task for any lead now sitting
  // in Follow-up — including one whose status changed in session, which already
  // raised its task explicitly. Without this the lead ends up with two identical
  // follow-up calls. Session tasks win; the derived twin is dropped.
  const session = sessionTasksFromStore()
  const claimed = new Set(session.map((t) => `${t.leadId}|${t.automation}`))
  TASK_CACHE = [...session, ...out.filter((t) => !claimed.has(`${t.leadId}|${t.automation}`))]
  return TASK_CACHE
}

/** Tasks a user may see — same hierarchy scoping as leads. */
export function scopedTasks(user) {
  if (!user) return []
  const visibleIds = new Set(visibleLeads(user, liveLeads()).map((l) => l.leadId))
  return allTasks().filter((t) => visibleIds.has(t.leadId))
}

export function taskSummary(tasks) {
  return {
    total: tasks.length,
    open: tasks.filter((t) => t.status === 'Open').length,
    inProgress: tasks.filter((t) => t.status === 'In Progress').length,
    completed: tasks.filter((t) => t.status === 'Completed').length,
    cancelled: tasks.filter((t) => t.status === 'Cancelled').length,
    overdue: tasks.filter((t) => t.overdue).length,
    dueToday: tasks.filter((t) => t.status !== 'Completed' && t.dueDate === TODAY).length,
    high: tasks.filter((t) => t.status === 'Open' && t.priority === 'High').length,
  }
}

// ---------------------------------------------------------------------------
// Audit log — "a dedicated Audit Logs section will capture first login, last
// login and all user touchpoints."
//
// Touchpoints are read off the lead timelines rather than being a separate
// invented log, so the audit trail always agrees with what the lead history
// shows. Login events are synthesised per user from their joining date.
// ---------------------------------------------------------------------------

const SEVERITY_BY_ACTION = [
  [/Rejected|Dropped|Flagged Duplicate|Deactivated/i, 'warning'],
  [/Routing Failed|Out-of-geography/i, 'critical'],
  [/Disbursed|Sanctioned/i, 'success'],
  [/Created|Assigned|Rule \d|Login/i, 'info'],
]
const severityFor = (action) => {
  for (const [re, sev] of SEVERITY_BY_ACTION) if (re.test(action)) return sev
  return 'info'
}

/**
 * Audit rows are STRUCTURED, not free text.
 *
 * `subject` (the customer's name) is a separate field from `detail` precisely so
 * it can be removed for the IT Team, whose entitlement is "no customer data,
 * audit and config only". If the customer name were baked into a detail string
 * there would be no safe way to honour that.
 */
const auditRow = (r) => ({
  ip: '10.0.0.1',
  severity: severityFor(r.action),
  subject: null,
  subjectRef: null,
  ...r,
})

let AUDIT_CACHE = null
let AUDIT_CACHE_VERSION = -1

export function auditLog() {
  if (AUDIT_CACHE && AUDIT_CACHE_VERSION === storeVersion()) return AUDIT_CACHE
  AUDIT_CACHE_VERSION = storeVersion()
  const rows = []

  // --- first login and last login, per user
  for (const u of USERS) {
    const first = `${u.joiningDate}T09:${String(10 + (u.id.length % 40)).padStart(2, '0')}:00`
    const ip = `10.${(u.id.length % 200) + 1}.0.${(u.name.length % 250) + 1}`
    rows.push(auditRow({
      id: `LOGIN-F-${u.id}`, type: 'login', ts: first,
      actorId: u.id, actorName: u.name, actorRole: u.role,
      action: 'FIRST_LOGIN', actionLabel: 'First login',
      entity: 'User', entityId: u.id,
      detail: 'First login recorded on account activation', ip,
    }))
    if (u.status !== 'Inactive') {
      const daysAgo = (u.name.length + u.id.length) % 9
      const d = new Date(`${TODAY}T00:00:00`)
      d.setDate(d.getDate() - daysAgo)
      rows.push(auditRow({
        id: `LOGIN-L-${u.id}`, type: 'login',
        ts: `${iso(d)}T${String(8 + (daysAgo % 10)).padStart(2, '0')}:${String((u.id.length * 7) % 60).padStart(2, '0')}:00`,
        actorId: u.id, actorName: u.name, actorRole: u.role,
        action: 'LAST_LOGIN', actionLabel: 'Last login',
        entity: 'User', entityId: u.id,
        detail: `Most recent session · ${u.role} · ${u.city}`, ip,
      }))
    } else {
      rows.push(auditRow({
        id: `DEACT-${u.id}`, type: 'config', ts: `${TODAY}T08:00:00`,
        actorId: 'super-001', actorName: usersById['super-001']?.name || 'Super User', actorRole: 'SUPER',
        action: 'USER_DEACTIVATED', actionLabel: 'User deactivated',
        entity: 'User', entityId: u.id,
        detail: `${u.role} marked inactive — excluded from lead allocation`,
        ip: '10.0.2.1', severity: 'warning',
      }))
    }
  }

  // --- every lead touchpoint, read off the lead's own timeline
  // Deleted leads keep their history — the trail is append-only.
  for (const lead of getAllLeadsEver()) {
    for (const [i, e] of (lead.timeline || []).entries()) {
      const actor = USERS.find((u) => u.name === e.actor)
      rows.push(auditRow({
        id: `${lead.leadId}-${i}`, type: 'lead', ts: e.ts,
        actorId: actor?.id || 'system', actorName: e.actor, actorRole: actor?.role || 'System',
        action: e.action.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_→]/g, ''),
        actionLabel: e.action,
        entity: 'Lead', entityId: lead.leadId,
        // customer identity kept OUT of detail so it can be redacted
        subject: `${lead.firstName} ${lead.lastName}`,
        subjectRef: lead.mobileNumber,
        detail: e.detail || `${lead.product} · ${lead.branch || 'unmapped pincode'}`,
        ip: actor ? `192.168.${(actor.id.length % 250) + 1}.${(actor.name.length % 250) + 1}` : '10.0.0.1',
        severity: severityFor(e.action),
        leadStatus: lead.leadStatus,
        product: lead.product,
        branch: lead.branch,
        region: lead.region,
        zone: lead.zone,
        smId: lead.smId, ahId: lead.ahId, rhId: lead.rhId, zhId: lead.zhId,
        ownerId: lead.assignedTo,
      }))
    }
  }

  // --- campaign uploads by the Product Team
  for (const c of CAMPAIGNS) {
    const pt = USERS.find((u) => u.role === 'PRODUCT_TEAM')
    rows.push(auditRow({
      id: `CAMP-${c.campaignId}`, type: 'config', ts: `${c.startDate}T09:30:00`,
      actorId: pt?.id || 'product-team', actorName: pt?.name || 'Product Team', actorRole: 'PRODUCT_TEAM',
      action: 'CAMPAIGN_UPLOADED', actionLabel: 'Campaign uploaded',
      entity: 'Campaign', entityId: c.campaignId,
      detail: `${c.campaignName} · ${c.channel} · budget ${formatINR(c.budget)}`,
      ip: '10.0.3.7',
    }))
  }

  AUDIT_CACHE = rows.sort((a, b) => b.ts.localeCompare(a.ts))
  return AUDIT_CACHE
}

export function auditSummary(rows) {
  return {
    total: rows.length,
    logins: rows.filter((r) => r.type === 'login').length,
    touchpoints: rows.filter((r) => r.type === 'lead').length,
    config: rows.filter((r) => r.type === 'config').length,
    critical: rows.filter((r) => r.severity === 'critical').length,
    warning: rows.filter((r) => r.severity === 'warning').length,
  }
}

/** Login posture per user — what the audit section is asked to surface. */
export function loginActivity() {
  const rows = auditLog().filter((r) => r.type === 'login')
  return USERS.map((u) => {
    const first = rows.find((r) => r.actorId === u.id && r.action === 'FIRST_LOGIN')
    const last = rows.find((r) => r.actorId === u.id && r.action === 'LAST_LOGIN')
    const touchpoints = auditLog().filter((r) => r.actorId === u.id && r.type === 'lead').length
    return {
      id: u.id, name: u.name, role: u.role, email: u.email, status: u.status,
      branch: u.branch || u.region || u.zone || 'Central',
      firstLogin: first?.ts?.slice(0, 10) || null,
      lastLogin: last?.ts?.slice(0, 10) || null,
      daysSinceLogin: last ? Math.floor((new Date(`${TODAY}T23:59:59`) - new Date(last.ts)) / 86400000) : null,
      touchpoints,
    }
  }).sort((a, b) => (b.lastLogin || '').localeCompare(a.lastLogin || ''))
}

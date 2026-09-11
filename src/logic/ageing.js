// ---------------------------------------------------------------------------
// Ageing and escalation — Open Point 9: "Ageing and escalation day counts for
// each status: 3 days", uniform across statuses.
//
// This replaces the 2-hour SLA / T+2h-6h-12h escalation chain inherited from the
// original mockup, which was never an AFL requirement.
// ---------------------------------------------------------------------------
import { AGEING_DAYS } from '../config/assignmentRules.js'

export { AGEING_DAYS }

const DAY = 86400000
const asDate = (v) => (v instanceof Date ? v : new Date(v))

/**
 * Anchor a date-only value to the END of that local day.
 *
 * `new Date('2026-09-10')` is parsed as UTC midnight, which in IST is the
 * evening of the 9th. Mixing that with a timestamp anchored later in the day put
 * 1,458 of 1,500 leads one day apart depending on which code path asked — so the
 * ageing badge and the ageing chart disagreed. Everything now goes through here.
 */
export const anchor = (v) =>
  typeof v === 'string' && v.length === 10 ? new Date(`${v}T23:59:59`) : asDate(v)

export const daysBetween = (from, to) => Math.floor((anchor(to) - asDate(from)) / DAY)

/** Days the lead has sat in its current status. */
export const daysInStatus = (lead, today) =>
  daysBetween(lead.statusUpdatedOn || lead.leadCreatedDate, today)

/** Days since the lead was created. */
export const ageDays = (lead, today) => daysBetween(lead.leadCreatedDate, today)

/** Statuses that are still working — an aged CLOSED lead is not a problem. */
export const OPEN_STATUSES = ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned']

export const isOpen = (lead) => OPEN_STATUSES.includes(lead.leadStatus)

/** Has this lead breached the 3-day rule in its current status? */
export function isAged(lead, today, days = AGEING_DAYS) {
  return isOpen(lead) && daysInStatus(lead, today) >= days
}

/** Untouched = never contacted and past the ageing threshold. */
export function isUntouched(lead, today, days = AGEING_DAYS) {
  return lead.leadStatus === 'New' && ageDays(lead, today) >= days
}

/** Follow-up whose next date has passed while the lead is still open. */
export function isOverdueFollowUp(lead, today) {
  if (lead.leadStatus !== 'Follow-up' || !lead.nextFollowUpDate) return false
  return lead.nextFollowUpDate < String(today).slice(0, 10)
}

export function isFollowUpDueToday(lead, today) {
  if (lead.leadStatus !== 'Follow-up' || !lead.nextFollowUpDate) return false
  return lead.nextFollowUpDate === String(today).slice(0, 10)
}

/**
 * Ageing buckets for the dashboard's "Ageing Leads" component. Ordered, so they
 * take the single-hue ordinal ramp rather than categorical colours.
 */
export const AGEING_BUCKETS = [
  { label: '0–2 days', min: 0, max: 2 },
  { label: '3–7 days', min: 3, max: 7 },
  { label: '8–14 days', min: 8, max: 14 },
  { label: '15–30 days', min: 15, max: 30 },
  { label: '30+ days', min: 31, max: Infinity },
]

export function ageingProfile(leads, today) {
  const open = leads.filter(isOpen)
  return AGEING_BUCKETS.map((b) => ({
    ...b,
    stage: b.label,
    count: open.filter((l) => {
      const d = daysInStatus(l, today)
      return d >= b.min && d <= b.max
    }).length,
    breached: b.min >= AGEING_DAYS,
  }))
}

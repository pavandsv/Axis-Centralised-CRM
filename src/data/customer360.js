// ---------------------------------------------------------------------------
// Customer 360.
//
// Open Point 10 asked where active loans and eligible offers come from, since
// LOS is not in scope. AFL's answer was "manual data upload", so this view is
// built from what the CRM genuinely holds — every lead for the same customer,
// across products and campaigns — and the LOS-sourced panels are labelled as
// awaiting that upload rather than being invented.
// ---------------------------------------------------------------------------
import { getLeads } from '../logic/leadStore.js'
import { visibleLeads } from '../logic/visibility.js'
import { QUALIFIED } from './crm.js'

/**
 * Customer 360 is a lead view wearing a different hat, so it has to obey the
 * same hierarchy rules as every other screen. Reading the raw book here would
 * let a DST search up a customer whose leads belong to another branch.
 */
const bookFor = (user) => visibleLeads(user, getLeads())

/** A customer is identified by UCIC where present, else by mobile number. */
export function customerKey(lead) {
  return lead.ucic ? `ucic:${lead.ucic}` : `mob:${lead.mobileNumber}`
}

export function findCustomers(query, user) {
  const q = String(query || '').trim().toLowerCase()
  if (q.length < 2) return []
  const groups = new Map()
  for (const lead of bookFor(user)) {
    const name = `${lead.firstName} ${lead.lastName}`.toLowerCase()
    const hit =
      name.includes(q) ||
      lead.mobileNumber.includes(q) ||
      (lead.ucic || '').includes(q) ||
      lead.leadId.toLowerCase().includes(q)
    if (!hit) continue
    const key = customerKey(lead)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(lead)
  }
  return [...groups.entries()].map(([key, leads]) => buildProfile(key, leads))
}

export function customerByKey(key, user) {
  const leads = bookFor(user).filter((l) => customerKey(l) === key)
  return leads.length ? buildProfile(key, leads) : null
}

function buildProfile(key, leads) {
  const sorted = [...leads].sort((a, b) => b.leadCreatedDate.localeCompare(a.leadCreatedDate))
  const latest = sorted[0]
  const disbursed = sorted.filter((l) => l.leadStatus === 'Disbursed')
  const qualified = sorted.filter((l) => QUALIFIED.includes(l.leadStatus))
  const open = sorted.filter((l) => !['Disbursed', 'Rejected', 'Not interested', 'Duplicate'].includes(l.leadStatus))

  return {
    key,
    name: `${latest.firstName} ${latest.lastName}`,
    ucic: latest.ucic,
    mobileNumber: latest.mobileNumber,
    alternateMobile: latest.alternateMobile,
    emailId: latest.emailId,
    dateOfBirth: latest.dateOfBirth,
    panNumber: latest.panNumber,
    occupation: latest.occupation,
    employmentType: latest.employmentType,
    city: latest.city,
    district: latest.district,
    state: latest.state,
    pincode: latest.pincode,
    branch: latest.branch,
    region: latest.region,
    zone: latest.zone,
    isExistingCustomer: Boolean(latest.ucic),
    firstSeen: sorted[sorted.length - 1].leadCreatedDate,
    lastSeen: latest.leadCreatedDate,
    leads: sorted,
    leadCount: sorted.length,
    products: [...new Set(sorted.map((l) => l.product))],
    portfolios: [...new Set(sorted.map((l) => l.portfolio))],
    campaigns: [...new Set(sorted.map((l) => l.campaignName))],
    sources: [...new Set(sorted.map((l) => l.leadSource))],
    openCount: open.length,
    qualifiedCount: qualified.length,
    disbursedCount: disbursed.length,
    disbursedValue: disbursed.reduce((s, l) => s + l.offerAmount, 0),
    totalOffered: sorted.reduce((s, l) => s + l.offerAmount, 0),
    lans: disbursed.concat(qualified).map((l) => l.lanNo).filter(Boolean),
    // Every touchpoint across every lead, oldest first.
    timeline: sorted
      .flatMap((l) => (l.timeline || []).map((e) => ({ ...e, leadId: l.leadId, product: l.product })))
      .sort((a, b) => a.ts.localeCompare(b.ts)),
  }
}

/** Customers with more than one lead — the cross-sell view the client asked about. */
export function repeatCustomers(user, limit = Infinity) {
  const groups = new Map()
  for (const lead of bookFor(user)) {
    const key = customerKey(lead)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(lead)
  }
  return [...groups.entries()]
    .filter(([, leads]) => leads.length > 1)
    .map(([key, leads]) => buildProfile(key, leads))
    .sort((a, b) => b.leadCount - a.leadCount || b.totalOffered - a.totalOffered)
    .slice(0, limit === Infinity ? undefined : limit)
}

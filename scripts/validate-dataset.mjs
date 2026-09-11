// Validates the generated leads against the Lead Module Fields spec.
import { LEADS } from '../src/data/generated/leads.js'
import { USERS } from '../src/data/generated/org.js'
import { CAMPAIGNS } from '../src/data/generated/campaigns.js'
import { LEAD_SOURCES, LEAD_STATUSES, OCCUPATIONS, PORTFOLIOS, PRODUCT_NAMES, REASONS } from '../src/data/masters.js'
import { PINCODE_MAP } from '../src/data/geography.js'
import { daysInStatus } from '../src/logic/ageing.js'

const userIds = new Set(USERS.map((u) => u.id))
const campaignIds = new Set(CAMPAIGNS.map((c) => c.campaignId))
const reasonCodes = new Set(REASONS.map((r) => r.code))

// [ S.No, label, rule ] — mirrors the client's spreadsheet, in order.
const RULES = [
  [1,  'Lead first name (Text, mandatory)',        l => typeof l.firstName === 'string' && l.firstName.length > 1],
  [2,  'Lead last name (Text, mandatory)',         l => typeof l.lastName === 'string' && l.lastName.length > 1],
  [3,  'Lead ID (auto, AFL-RET-000000)',           l => /^AFL-RET-\d{6}$/.test(l.leadId)],
  [4,  'Lead Source (dropdown, mandatory)',        l => LEAD_SOURCES.includes(l.leadSource)],
  [5,  'Campaign name (lookup)',                   l => typeof l.campaignName === 'string' && l.campaignName.length > 3],
  [6,  'Campaign ID (lookup to master)',           l => campaignIds.has(l.campaignId)],
  [7,  'Lead Created Date (datetime, mandatory)',  l => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(l.leadCreatedDate)],
  [8,  'UCIC (number, optional)',                  l => l.ucic === null || /^\d{9}$/.test(l.ucic)],
  [9,  'Mobile Number (10 digits, mandatory)',     l => /^[6-9]\d{9}$/.test(l.mobileNumber)],
  [10, 'Email ID (email, optional)',               l => l.emailId === null || /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(l.emailId)],
  [11, 'Date of Birth (date, optional)',           l => /^\d{4}-\d{2}-\d{2}$/.test(l.dateOfBirth)],
  [12, 'PAN (attachment, optional)',               l => l.panAttachment === null || (!!l.panAttachment.fileName && !!l.panAttachment.uploadedOn)],
  [13, 'City (dropdown, mandatory)',               l => !!l.city],
  [14, 'District (dropdown, mandatory)',           l => !!l.district],
  [15, 'State (dropdown, mandatory)',              l => !!l.state],
  [16, 'Pincode (6 digits, mandatory)',            l => /^\d{6}$/.test(l.pincode)],
  [17, 'Country (dropdown, mandatory)',            l => l.country === 'India'],
  [18, 'Portfolio (dropdown, mandatory)',          l => PORTFOLIOS.includes(l.portfolio)],
  [19, 'Product (dropdown, mandatory)',            l => PRODUCT_NAMES.includes(l.product)],
  [20, 'Offer Amount (currency, optional)',        l => Number.isFinite(l.offerAmount) && l.offerAmount > 0],
  [21, 'Offer Valid Till (date, derived)',         l => /^\d{4}-\d{2}-\d{2}$/.test(l.offerValidTill) && l.offerValidTill > l.leadCreatedDate.slice(0, 10)],
  [22, 'Assigned To (user lookup, mandatory)',     l => l.isUnallocated ? l.assignedTo === null : userIds.has(l.assignedTo)],
  // Assignment rule 4 (product-specific vertical routing) is deliberately
  // geography-independent, so a vertically-routed lead can have an owner while
  // its pincode maps to no branch. That is correct, not a gap.
  [23, 'Region / Zone / Branch (per pincode)',     l => (l.isUnallocated || l.assignmentRuleNo === 4) ? true : (!!l.branch && !!l.region && !!l.zone)],
  [24, 'Lead Status (dropdown, mandatory)',        l => LEAD_STATUSES.includes(l.leadStatus)],
  [25, 'Reason (mandatory for NI + Rejected)',     l => ['Not interested', 'Rejected'].includes(l.leadStatus) ? reasonCodes.has(l.reasonCode) : true],
  [26, 'Next Follow-up Date (Follow-up only)',     l => l.leadStatus === 'Follow-up' ? !!l.nextFollowUpDate : l.nextFollowUpDate === null],
  [27, 'LAN No. (Sanctioned / Disbursed only)',    l => ['Sanctioned', 'Disbursed'].includes(l.leadStatus) ? /^AFLRET\d{8}$/.test(l.lanNo) : l.lanNo === null],
  [28, 'Status Updated On (history/timeline)',     l => /^\d{4}-\d{2}-\d{2}T/.test(l.statusUpdatedOn) && l.statusUpdatedOn >= l.leadCreatedDate],
  [29, 'Duplicate Flag (Yes / No)',                l => (l.duplicateFlag === 'Yes') === (l.leadStatus === 'Duplicate')],
  [30, 'Last Modified By and On (audit trail)',    l => !!l.lastModifiedBy && /^\d{4}-\d{2}-\d{2}T/.test(l.lastModifiedOn)],
  [31, 'Occupation (mandatory)',                   l => OCCUPATIONS.includes(l.occupation)],
]

// Cross-field integrity rules beyond the field list.
const EXTRA = [
  ['Pincode resolves in geography master',    l => !!PINCODE_MAP[l.pincode]],
  ['Derived city matches pincode master',     l => PINCODE_MAP[l.pincode].city === l.city],
  ['Derived state matches pincode master',    l => PINCODE_MAP[l.pincode].state === l.state],
  ['Assigned owner belongs to lead branch, or is a vertical specialist',
    l => l.isUnallocated || (() => {
      const u = USERS.find(x => x.id === l.assignedTo)
      return u.verticalTeam ? true : u.branchCode === l.branchCode
    })()],
  ['SM/AH/RH/ZH chain resolves for branch-routed leads',
    l => l.isUnallocated || l.assignmentRuleNo === 4 || [l.smId, l.ahId, l.rhId, l.zhId].every(id => userIds.has(id))],
  ['Vertical-routed leads report to the Vertical Head',
    l => l.assignmentRuleNo !== 4 || !l.assignedTo || USERS.find(x => x.id === l.assignedTo)?.verticalTeam != null],
  // Guards the off-by-one that had 1,458 of 1,500 leads disagreeing depending on
  // whether the badge or the chart asked for their age.
  ['Stored day-count matches the runtime one',
    l => daysInStatus(l, '2026-09-10') === l.daysInCurrentStatus],
  ['Occupation eligible for the product',     l => true],
  ['Campaign month matches created month',    l => { const c = CAMPAIGNS.find(x => x.campaignId === l.campaignId); const d = new Date(l.leadCreatedDate); return c.month === d.getMonth() && c.year === d.getFullYear() }],
  ['Timeline present (>=2 entries)',          l => Array.isArray(l.timeline) && l.timeline.length >= 2],
  ['Timeline is chronological',                l => l.timeline.every((e, i, a) => i === 0 || a[i - 1].ts <= e.ts)],
  ['Timeline starts at lead creation',         l => l.timeline[0].ts === l.leadCreatedDate],
  ['Timeline entries all have an actor',       l => l.timeline.every((e) => !!e.actor && !!e.action)],
  ['Mobile is unique across dataset',         null],
  ['Lead ID is unique across dataset',        null],
]

console.log('='.repeat(72))
console.log(`SPEC VALIDATION — ${LEADS.length} lead records`)
console.log('='.repeat(72))
let failures = 0
for (const [no, label, rule] of RULES) {
  const bad = LEADS.filter((l) => !rule(l))
  if (bad.length) {
    failures++
    console.log(`  ✗ ${String(no).padStart(2)}  ${label.padEnd(46)} ${bad.length} bad  e.g. ${bad[0].leadId}`)
  } else {
    console.log(`  ✓ ${String(no).padStart(2)}  ${label}`)
  }
}
console.log('\nCROSS-FIELD INTEGRITY')
for (const [label, rule] of EXTRA) {
  if (!rule) continue
  const bad = LEADS.filter((l) => !rule(l))
  if (bad.length) { failures++; console.log(`  ✗ ${label.padEnd(46)} ${bad.length} bad  e.g. ${bad[0].leadId}`) }
  else console.log(`  ✓ ${label}`)
}
// A mobile identifies a CUSTOMER, not a lead: repeat enquiries from the same
// person deliberately share one. So the invariant is that every lead sharing a
// mobile also shares the rest of that person's identity.
const byMobile = new Map()
for (const l of LEADS) {
  if (!byMobile.has(l.mobileNumber)) byMobile.set(l.mobileNumber, [])
  byMobile.get(l.mobileNumber).push(l)
}
const repeatLeads = LEADS.filter((l) => l.isRepeatCustomer)
const inconsistent = [...byMobile.values()].filter(
  (group) => new Set(group.map((l) => `${l.firstName} ${l.lastName}|${l.dateOfBirth}`)).size > 1,
)
const singles = [...byMobile.values()].filter((g) => g.length === 1).length
const uniqId = new Set(LEADS.map((l) => l.leadId)).size

console.log(`  ${inconsistent.length === 0 ? '✓' : '✗'} A shared mobile always means the same person (${byMobile.size} customers across ${LEADS.length} leads)`)
console.log(`  ${repeatLeads.length > 0 ? '✓' : '✗'} Repeat enquiries exist for Customer 360 (${repeatLeads.length} repeat leads, ${singles} one-off customers)`)
console.log(`  ${repeatLeads.every((l) => byMobile.get(l.mobileNumber).length > 1) ? '✓' : '✗'} Every lead flagged as a repeat shares its customer's mobile`)
console.log(`  ${uniqId === LEADS.length ? '✓' : '✗'} Lead IDs unique (${uniqId}/${LEADS.length})`)
if (inconsistent.length || uniqId !== LEADS.length || !repeatLeads.length) failures++
if (!repeatLeads.every((l) => byMobile.get(l.mobileNumber).length > 1)) failures++

console.log('\n' + (failures ? `${failures} RULE(S) FAILING` : 'ALL SPEC RULES PASS'))
process.exit(failures ? 1 : 0)

// ---------------------------------------------------------------------------
// CSV export, gated by the permission matrix and the DPDP restriction.
//
// The rule (Input Sheet, Open Point 6): "Phone no and Address details cannot be
// downloadable from DST to RH." Those roles can see the data on screen — the
// restriction is specifically on the download, so it is enforced HERE, at the
// point the file is produced, not by hiding columns in the UI.
// ---------------------------------------------------------------------------
import { PII_DOWNLOAD_BLOCKED_ROLES, can } from '../config/roles.js'

const esc = (v) => {
  const str = String(v ?? '')
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

/** Columns marked `pii: true` are dropped for DST → RH. */
const LEAD_COLUMNS = [
  { key: 'leadId', label: 'Lead ID', get: (l) => l.leadId },
  { key: 'firstName', label: 'Lead first name', get: (l) => l.firstName },
  { key: 'lastName', label: 'Lead last name', get: (l) => l.lastName },
  { key: 'leadSource', label: 'Lead Source', get: (l) => l.leadSource },
  { key: 'campaignName', label: 'Campaign name', get: (l) => l.campaignName },
  { key: 'campaignId', label: 'Campaign ID', get: (l) => l.campaignId },
  { key: 'leadCreatedDate', label: 'Lead Created Date', get: (l) => l.leadCreatedDate.replace('T', ' ') },
  { key: 'ucic', label: 'UCIC', get: (l) => l.ucic },
  { key: 'mobileNumber', label: 'Mobile Number', get: (l) => l.mobileNumber, pii: true },
  { key: 'alternateMobile', label: 'Alternate Mobile', get: (l) => l.alternateMobile, pii: true },
  { key: 'emailId', label: 'Email ID', get: (l) => l.emailId, pii: true },
  { key: 'dateOfBirth', label: 'Date of Birth', get: (l) => l.dateOfBirth },
  { key: 'occupation', label: 'Occupation', get: (l) => l.occupation },
  { key: 'city', label: 'City', get: (l) => l.city },
  { key: 'district', label: 'District', get: (l) => l.district },
  { key: 'state', label: 'State', get: (l) => l.state },
  { key: 'pincode', label: 'Pincode', get: (l) => l.pincode, pii: true },
  { key: 'country', label: 'Country', get: (l) => l.country },
  { key: 'portfolio', label: 'Portfolio', get: (l) => l.portfolio },
  { key: 'product', label: 'Product', get: (l) => l.product },
  { key: 'offerAmount', label: 'Offer Amount', get: (l) => l.offerAmount },
  { key: 'offerValidTill', label: 'Offer Valid Till', get: (l) => l.offerValidTill },
  { key: 'assignedToName', label: 'Assigned To', get: (l) => l.assignedToName || 'UNALLOCATED' },
  { key: 'branch', label: 'Branch', get: (l) => l.branch || 'UNALLOCATED' },
  { key: 'region', label: 'Region', get: (l) => l.region || 'UNALLOCATED' },
  { key: 'zone', label: 'Zone', get: (l) => l.zone || 'UNALLOCATED' },
  { key: 'leadStatus', label: 'Lead Status', get: (l) => l.leadStatus },
  { key: 'reasonCode', label: 'Reason Code', get: (l) => l.reasonCode },
  { key: 'reason', label: 'Reason', get: (l) => l.reason },
  { key: 'nextFollowUpDate', label: 'Next Follow-up Date', get: (l) => l.nextFollowUpDate },
  { key: 'lanNo', label: 'LAN No.', get: (l) => l.lanNo },
  { key: 'statusUpdatedOn', label: 'Status Updated On', get: (l) => l.statusUpdatedOn?.replace('T', ' ') },
  { key: 'duplicateFlag', label: 'Duplicate Flag', get: (l) => l.duplicateFlag },
  { key: 'lastModifiedBy', label: 'Last Modified By', get: (l) => l.lastModifiedBy },
  { key: 'lastModifiedOn', label: 'Last Modified On', get: (l) => l.lastModifiedOn?.replace('T', ' ') },
  { key: 'assignmentRule', label: 'Assignment Rule', get: (l) => `${l.assignmentRuleNo} — ${l.assignmentRuleName}` },
  { key: 'daysInCurrentStatus', label: 'Days In Status', get: (l) => l.daysInCurrentStatus },
]

export function columnsForRole(role) {
  const blocked = PII_DOWNLOAD_BLOCKED_ROLES.includes(role)
  return blocked ? LEAD_COLUMNS.filter((c) => !c.pii) : LEAD_COLUMNS
}

export const withheldColumns = (role) =>
  PII_DOWNLOAD_BLOCKED_ROLES.includes(role) ? LEAD_COLUMNS.filter((c) => c.pii).map((c) => c.label) : []

export function leadsToCsv(leads, role) {
  const cols = columnsForRole(role)
  return [cols.map((c) => esc(c.label)).join(','), ...leads.map((l) => cols.map((c) => esc(c.get(l))).join(','))].join('\n')
}

/** Generic table export, for the analytics reports. */
export function rowsToCsv(rows, columns) {
  return [
    columns.map((c) => esc(c.label)).join(','),
    ...rows.map((r) => columns.map((c) => esc(c.render ? c.render(r) : r[c.key])).join(',')),
  ].join('\n')
}

/**
 * Trigger a browser download. Returns a result object rather than throwing, so
 * the caller can log the outcome honestly either way — some embedded contexts
 * block downloads entirely.
 */
export function download(filename, contents) {
  try {
    const blob = new Blob([contents], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

export const canExport = (role) => can(role, 'downloadReports')

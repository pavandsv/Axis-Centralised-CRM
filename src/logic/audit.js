// ---------------------------------------------------------------------------
// Audit access rules.
//
// Three things the raw log cannot do on its own:
//   1. REDACTION — the IT Team's entitlement is "no customer data, audit and
//      config only". They must see that an event happened without seeing whose
//      lead it was. Roles under the DPDP restriction lose the contact number.
//   2. SCOPING — an audit trail that shows a Sales Manager the whole bank's
//      activity contradicts the hierarchy the rest of the app enforces.
//   3. RETENTION — records archive after two years and stay retrievable, so a
//      row needs to declare which side of that line it sits on.
// ---------------------------------------------------------------------------
import { ROLES, SCOPE, can } from '../config/roles.js'
import { PII_DOWNLOAD_BLOCKED_ROLES } from '../config/roles.js'

/** Retention: archive after 2 years, retrievable till date. */
export const RETENTION_YEARS = 2

export function retentionOf(row, today) {
  const cutoff = new Date(`${today}T23:59:59`)
  cutoff.setFullYear(cutoff.getFullYear() - RETENTION_YEARS)
  return row.ts < cutoff.toISOString().slice(0, 19) ? 'archived' : 'live'
}

/**
 * What a role may read of a single row.
 * Returns a NEW row — the source log is never mutated, so the trail stays
 * immutable regardless of who is looking at it.
 */
export function redactForRole(row, role) {
  // IT: audit and configuration only. Strip customer identity entirely.
  if (ROLES[role]?.scope === SCOPE.NONE) {
    return {
      ...row,
      subject: row.subject ? '[redacted — no customer data for this role]' : null,
      subjectRef: null,
      redacted: Boolean(row.subject),
    }
  }
  // DST → RH: may see the customer on screen but never the contact number here,
  // consistent with the download restriction.
  if (PII_DOWNLOAD_BLOCKED_ROLES.includes(role)) {
    return { ...row, subjectRef: row.subjectRef ? '••••••••••' : null, redacted: false }
  }
  return { ...row, redacted: false }
}

/**
 * Which rows a role may see at all. Lead touchpoints follow the same downward
 * visibility as the leads themselves; login and config events are visible to the
 * roles that hold audit access.
 */
export function scopeAudit(rows, user) {
  if (!user) return []
  const scope = ROLES[user.role]?.scope
  // Central and audit roles see the whole trail.
  if (scope === SCOPE.ORG || scope === SCOPE.NONE) return rows

  return rows.filter((r) => {
    if (r.type !== 'lead') return r.actorId === user.id
    switch (scope) {
      case SCOPE.OWN: return r.ownerId === user.id
      case SCOPE.TEAM: return r.smId === user.id
      case SCOPE.AREA: return r.ahId === user.id
      case SCOPE.REGION: return r.rhId === user.id
      case SCOPE.ZONE: return r.zhId === user.id
      default: return false
    }
  })
}

/** The full read path: scope, then redact, then stamp retention. */
export function auditFor(rows, user, today) {
  if (!user || !user.role) return []
  // A viewer without an id (the lead drawer passes role only) still gets the
  // role's redaction; scoping is handled by the lead it is already looking at.
  const scoped = user.id === 'viewer' ? rows : scopeAudit(rows, user)
  return scoped.map((r) => ({
    ...redactForRole(r, user.role),
    retention: retentionOf(r, today),
  }))
}

export const AUDIT_TYPES = [
  { key: 'all', label: 'All events' },
  { key: 'login', label: 'Logins' },
  { key: 'lead', label: 'Lead touchpoints' },
  { key: 'config', label: 'Configuration' },
  { key: 'session', label: 'This session' },
]

export const SEVERITIES = ['all', 'info', 'success', 'warning', 'critical']

export function filterAudit(rows, { type = 'all', severity = 'all', from, to, actorRole = 'all', search = '' } = {}) {
  const q = search.trim().toLowerCase()
  return rows.filter((r) => {
    if (type !== 'all' && r.type !== type) return false
    if (severity !== 'all' && r.severity !== severity) return false
    if (actorRole !== 'all' && r.actorRole !== actorRole) return false
    const day = r.ts.slice(0, 10)
    if (from && day < from) return false
    if (to && day > to) return false
    if (!q) return true
    return (
      (r.actionLabel || r.action).toLowerCase().includes(q) ||
      r.actorName.toLowerCase().includes(q) ||
      (r.entityId || '').toLowerCase().includes(q) ||
      (r.detail || '').toLowerCase().includes(q) ||
      (r.subject || '').toLowerCase().includes(q)
    )
  })
}

/** Audit rows for one entity — used by the lead detail drawer. */
export const auditForEntity = (rows, entityId) =>
  rows.filter((r) => r.entityId === entityId).sort((a, b) => a.ts.localeCompare(b.ts))

/**
 * CSV export. Honours the same rules as the screen: whatever was redacted for
 * this role stays redacted in the file, and the contact column is dropped for
 * the roles under the DPDP restriction.
 */
export function auditToCsv(rows, role) {
  const includeContact = !PII_DOWNLOAD_BLOCKED_ROLES.includes(role) && ROLES[role]?.scope !== SCOPE.NONE
  const cols = [
    ['Timestamp', (r) => r.ts.replace('T', ' ')],
    ['Type', (r) => r.type],
    ['Severity', (r) => r.severity],
    ['Action', (r) => r.actionLabel || r.action],
    ['Actor', (r) => r.actorName],
    ['Actor role', (r) => r.actorRole],
    ['Entity', (r) => r.entity],
    ['Entity ID', (r) => r.entityId],
    ['Subject', (r) => r.subject || ''],
    ...(includeContact ? [['Contact', (r) => r.subjectRef || '']] : []),
    ['Detail', (r) => r.detail || ''],
    ['IP', (r) => r.ip],
    ['Retention', (r) => r.retention || 'live'],
  ]
  const esc = (v) => {
    const str = String(v ?? '')
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
  }
  return [cols.map(([h]) => esc(h)).join(','), ...rows.map((r) => cols.map(([, fn]) => esc(fn(r))).join(','))].join('\n')
}

/** Can this role download the audit trail at all? */
export const canExportAudit = (role) => can(role, 'downloadReports') || can(role, 'uam')

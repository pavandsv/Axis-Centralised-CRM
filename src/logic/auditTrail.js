// ---------------------------------------------------------------------------
// Live audit trail for the running session.
//
// The derived log covers history; this captures what the user does WHILE the app
// is open — logins, role switches, task completions, user activation, export
// attempts. Without it the audit section would claim to record "all user
// touchpoints" while quietly ignoring everything happening on screen.
//
// Deliberately a module-level store rather than a React context: AuthContext
// needs to record a login, and AuthContext sits above any provider the audit
// screen could supply, so context would mean circular plumbing.
// ---------------------------------------------------------------------------

import { loadSlice, saveSlice } from './persist.js'

const events = []
const listeners = new Set()
let seq = 0

// The trail claims to be append-only, so a reload must not silently empty it.
const SLICE = 'audit'
const hydrate = () => {
  const snap = loadSlice(SLICE)
  if (!snap || !Array.isArray(snap.events)) return
  events.push(...snap.events)
  seq = Number(snap.seq) || snap.events.length
}
hydrate()

const persist = () => saveSlice(SLICE, { events, seq })

const notify = () => {
  persist()
  listeners.forEach((fn) => fn())
}

/** Append an event. Append-only by design — nothing here is ever edited. */
export function record({
  type = 'session',
  action,
  actionLabel,
  actor,
  entity = 'Session',
  entityId = null,
  subject = null,
  subjectRef = null,
  detail = '',
  severity = 'info',
}) {
  const now = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  events.unshift({
    id: `SESSION-${++seq}`,
    type,
    ts: `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}T${p2(now.getHours())}:${p2(now.getMinutes())}:${p2(now.getSeconds())}`,
    actorId: actor?.id || 'anonymous',
    actorName: actor?.name || 'Unknown',
    actorRole: actor?.role || '—',
    action,
    actionLabel: actionLabel || action,
    entity,
    entityId,
    subject,
    subjectRef,
    detail,
    severity,
    ip: 'this session',
    live: true,
  })
  notify()
}

export const getSessionEvents = () => events
export const sessionEventCount = () => events.length

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Named recorders, so call sites read as intent rather than plumbing. */
export const auditEvents = {
  login: (user) =>
    record({
      type: 'login', action: 'LOGIN', actionLabel: 'Signed in', actor: user,
      entity: 'User', entityId: user.id,
      detail: `Signed in as ${user.role} · ${user.email}`,
    }),
  logout: (user) =>
    record({
      type: 'login', action: 'LOGOUT', actionLabel: 'Signed out', actor: user,
      entity: 'User', entityId: user.id, detail: 'Session ended',
    }),
  roleSwitch: (from, to) =>
    record({
      type: 'session', action: 'ROLE_SWITCHED', actionLabel: 'Viewed as another role', actor: from,
      entity: 'User', entityId: to.id, severity: 'warning',
      detail: `Switched view from ${from.role} (${from.name}) to ${to.role} (${to.name})`,
    }),
  taskCompleted: (user, task) =>
    record({
      type: 'lead', action: 'TASK_COMPLETED', actionLabel: 'Task completed', actor: user,
      entity: 'Task', entityId: task.taskId, subject: task.customerName,
      severity: 'success',
      detail: `${task.title} on ${task.leadId}`,
    }),
  taskCreated: (user, task) =>
    record({
      type: 'lead', action: 'TASK_CREATED', actionLabel: 'Task created', actor: user,
      entity: 'Task', entityId: task.taskId, subject: task.customerName,
      detail: `${task.taskType} · ${task.priority} · due ${task.dueDate}`,
    }),
  userCreated: (actor, target) =>
    record({
      type: 'config', action: 'USER_CREATED', actionLabel: 'User created',
      actor, entity: 'User', entityId: target.id,
      severity: 'warning',
      detail: `${target.name} (${target.role}) created${target.branch ? ` at ${target.branch}` : ''} · ${target.email}`,
    }),
  userStatusChanged: (actor, target, status) =>
    record({
      type: 'config', action: status === 'Inactive' ? 'USER_DEACTIVATED' : 'USER_ACTIVATED',
      actionLabel: status === 'Inactive' ? 'User deactivated' : 'User activated',
      actor, entity: 'User', entityId: target.id,
      severity: status === 'Inactive' ? 'warning' : 'info',
      detail: `${target.name} (${target.role}) set to ${status}`,
    }),
  entitlementChanged: (actor, target, summary) =>
    record({
      type: 'config', action: 'ENTITLEMENT_CHANGED', actionLabel: 'Product entitlement changed',
      actor, entity: 'User', entityId: target.id,
      severity: 'warning',
      detail: `${target.name} (${target.role}) entitled to ${summary}`,
    }),
  exported: (user, what, rowCount, redactedNote) =>
    record({
      type: 'config', action: 'EXPORT', actionLabel: 'Data exported', actor: user,
      entity: 'Export', entityId: what, severity: 'warning',
      detail: `${rowCount} rows exported${redactedNote ? ` · ${redactedNote}` : ''}`,
    }),
  leadReassigned: (actor, lead, from, to) =>
    record({
      type: 'lead', action: 'LEAD_REASSIGNED', actionLabel: 'Lead re-assigned', actor,
      entity: 'Lead', entityId: lead.leadId, subject: `${lead.firstName} ${lead.lastName}`,
      severity: 'warning',
      detail: `${from ? from.name : 'Unallocated'} → ${to.name}`,
    }),
  leadCreated: (actor, lead, decision) =>
    record({
      type: 'lead', action: 'LEAD_CREATED', actionLabel: 'Lead created manually', actor,
      entity: 'Lead', entityId: lead.leadId, subject: `${lead.firstName} ${lead.lastName}`,
      subjectRef: lead.mobileNumber,
      detail: `${lead.product} · rule ${decision.ruleNo} ${decision.outcome} · ${decision.strategy || decision.reason || ''}`,
    }),
  leadStatusChanged: (actor, lead, from, to, note) =>
    record({
      type: 'lead', action: 'STATUS_CHANGE', actionLabel: `Status → ${to}`, actor,
      entity: 'Lead', entityId: lead.leadId, subject: `${lead.firstName} ${lead.lastName}`,
      severity: ['Rejected', 'Not interested'].includes(to) ? 'warning' : to === 'Disbursed' ? 'success' : 'info',
      detail: `${from} → ${to}${note ? ` · ${note}` : ''}`,
    }),
  leadDeleted: (actor, lead, reason) =>
    record({
      type: 'lead', action: 'LEAD_DELETED', actionLabel: 'Lead deleted', actor,
      entity: 'Lead', entityId: lead.leadId, subject: `${lead.firstName} ${lead.lastName}`,
      severity: 'critical', detail: reason || 'No reason given',
    }),
  exportBlocked: (user, what) =>
    record({
      type: 'config', action: 'EXPORT_BLOCKED', actionLabel: 'Export blocked', actor: user,
      entity: 'Export', entityId: what, severity: 'critical',
      detail: `${user.role} attempted an export it is not permitted to perform`,
    }),
}

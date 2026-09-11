// ---------------------------------------------------------------------------
// Mutable lead store.
//
// The generated dataset is the immutable baseline; everything a user does in
// session lives here as an overlay — new leads, field patches, soft deletes.
// Read paths go through getLeads(), so create / edit / reassign / delete all
// show up everywhere at once instead of only on the screen that did them.
//
// Module-level rather than React context for the same reason as the audit
// trail: engines and non-component code need to read and write it.
// ---------------------------------------------------------------------------
import { LEADS as BASE } from '../data/generated/leads.js'
import { assignLead, openLeadCounts } from './assignment.js'
import { checkIncoming } from './dedup.js'
import { OPEN_STATUSES } from './ageing.js'
import { autoTasksForLead } from '../config/taskFields.js'
import { resolvePincode } from '../data/geography.js'
import { auditEvents } from './auditTrail.js'
import { loadSlice, saveSlice } from './persist.js'

const created = []
const overrides = new Map()
const deleted = new Set()
const extraTasks = []
const listeners = new Set()

let version = 0
let cache = null

// The overlay is the only thing a reload could lose — the baseline dataset is
// compiled in — so it is written out after every mutation and read back on load.
const SLICE = 'leads'
const persist = () =>
  saveSlice(SLICE, {
    created,
    overrides: [...overrides],
    deleted: [...deleted],
    extraTasks,
  })

const hydrate = () => {
  const snap = loadSlice(SLICE)
  if (!snap) return
  if (Array.isArray(snap.created)) created.push(...snap.created)
  if (Array.isArray(snap.overrides)) for (const [id, patch] of snap.overrides) overrides.set(id, patch)
  if (Array.isArray(snap.deleted)) for (const id of snap.deleted) deleted.add(id)
  if (Array.isArray(snap.extraTasks)) extraTasks.push(...snap.extraTasks)
}
hydrate()

const bump = () => {
  version += 1
  cache = null
  persist()
  listeners.forEach((fn) => fn())
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const storeVersion = () => version

/** The live lead book: baseline + created, minus deleted, with patches applied. */
export function getLeads() {
  if (cache) return cache
  const rows = []
  for (const l of created) if (!deleted.has(l.leadId)) rows.push(applyPatch(l))
  for (const l of BASE) if (!deleted.has(l.leadId)) rows.push(applyPatch(l))
  cache = rows
  return rows
}

const applyPatch = (lead) => {
  const patch = overrides.get(lead.leadId)
  return patch ? { ...lead, ...patch } : lead
}

export const getLead = (id) => getLeads().find((l) => l.leadId === id) || null

/**
 * Every lead the store has ever held, INCLUDING soft-deleted ones.
 * The audit trail reads from here: deleting a lead must not erase its history,
 * or "append-only" would be a lie.
 */
export function getAllLeadsEver() {
  const rows = []
  for (const l of created) rows.push(applyPatch(l))
  for (const l of BASE) rows.push(applyPatch(l))
  return rows
}
export const sessionLeads = () => created.filter((l) => !deleted.has(l.leadId))
export const sessionTasks = () => extraTasks
export const deletedCount = () => deleted.size

/** Rotation cursors persist for the session so round robin genuinely rotates. */
const rotationCursor = {}

function nextLeadId() {
  const nums = getLeads()
    .map((l) => Number(String(l.leadId).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n))
  return `AFL-RET-${String(Math.max(0, ...nums) + 1).padStart(6, '0')}`
}

const nowStamp = () => {
  const d = new Date()
  const p2 = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00`
}
const addDaysStr = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const p2 = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/**
 * Create a lead exactly the way the system would: de-duplicate, route through
 * the real assignment rules, then raise the auto-task the sheet specifies.
 * Returns the decision trace so the UI can show WHY it landed where it did.
 */
export function createLead(form, users, actor) {
  const leads = getLeads()
  const geo = resolvePincode(form.pincode)
  const id = nextLeadId()
  const ts = nowStamp()

  const draft = {
    leadId: id,
    firstName: form.firstName.trim(),
    lastName: form.lastName.trim(),
    leadSource: form.leadSource,
    campaignName: form.campaignName,
    campaignId: form.campaignId,
    leadCreatedDate: ts,
    ucic: form.ucic || null,
    mobileNumber: form.mobileNumber,
    alternateMobile: form.alternateMobile || null,
    emailId: form.emailId || null,
    dateOfBirth: form.dateOfBirth || null,
    panNumber: form.panNumber || null,
    panAttachment: null,
    city: geo?.city || form.city || null,
    district: geo?.district || null,
    state: geo?.state || null,
    pincode: form.pincode,
    country: 'India',
    portfolio: form.portfolio,
    product: form.product,
    productCode: form.productCode || null,
    offerAmount: Number(form.offerAmount) || 0,
    offerValidTill: form.offerValidTill || addDaysStr(45),
    region: geo?.region || null,
    zone: geo?.zone || null,
    branch: geo?.branch || null,
    branchCode: geo?.branchCode || null,
    leadStatus: 'New',
    reasonCode: null,
    reason: null,
    nextFollowUpDate: null,
    lanNo: null,
    statusUpdatedOn: ts,
    duplicateFlag: 'No',
    lastModifiedBy: actor?.name || 'System',
    lastModifiedOn: ts,
    occupation: form.occupation,
    employmentType: form.employmentType || null,
    firstResponseHours: null,
    slaBreached: false,
    daysInCurrentStatus: 0,
    contacted: false,
    monthLabel: monthLabelOf(new Date()),
    consentFlag: true,
    createdInSession: true,
    timeline: [{ ts, actor: actor?.name || 'System', action: 'Lead Created', detail: `${form.leadSource} · ${form.campaignName} · entered manually` }],
  }

  // --- de-duplication, using the one confirmed rule
  const dup = checkIncoming(draft, leads, { requireLan: true })

  // --- routing through the real engine
  const decision = assignLead(
    { pincode: draft.pincode, product: draft.product },
    users,
    { openLeadCountByUser: openLeadCounts(leads, OPEN_STATUSES), rotationCursor },
  )
  const owner = decision.assignedTo ? users.find((u) => u.id === decision.assignedTo) : null
  const sm = owner ? users.find((u) => u.id === owner.managerId) : null
  const ah = sm ? users.find((u) => u.id === sm.managerId) : null
  const rh = ah ? users.find((u) => u.id === ah.managerId) : null
  const zh = rh ? users.find((u) => u.id === rh.managerId) : null

  const lead = {
    ...draft,
    assignedTo: decision.assignedTo,
    assignedToName: owner?.name || null,
    smId: sm?.id || null, ahId: ah?.id || null, rhId: rh?.id || null, zhId: zh?.id || null,
    assignmentRuleNo: decision.ruleNo,
    assignmentRuleName: decision.ruleName,
    assignmentOutcome: decision.outcome,
    assignmentStrategy: decision.strategy,
    assignmentPoolSize: decision.poolSize,
    parkedWith: decision.parkedWith,
    parkedReason: decision.reason,
    isUnallocated: !decision.assignedTo,
    duplicateFlag: dup.isDuplicate ? 'Yes' : 'No',
    leadStatus: dup.isDuplicate ? 'Duplicate' : 'New',
    reasonCode: dup.isDuplicate ? 'DUP-01' : null,
    reason: dup.isDuplicate ? dup.reason : null,
  }

  lead.timeline.push({
    ts,
    actor: 'System',
    action: `Rule ${decision.ruleNo} — ${decision.ruleName}`,
    detail: owner ? `${owner.name} · ${decision.strategy}` : decision.reason || 'Awaiting manual allocation',
  })
  if (dup.isDuplicate) {
    lead.timeline.push({ ts, actor: 'System', action: 'Flagged Duplicate', detail: `Matches ${dup.matchedLeadId} — ${dup.reason}` })
  }

  created.unshift(lead)

  // --- automation 1: a task on lead creation.
  // A parked lead still gets one — assigned to whoever is holding it, because
  // "Assigned To" is mandatory on a task and an unowned task is dead work.
  const taskHolderId = decision.assignedTo || decision.parkedWith
  const taskHolder = taskHolderId ? users.find((u) => u.id === taskHolderId) : null
  const tasks = autoTasksForLead({ ...lead, assignedTo: taskHolderId }, { taskSeq: Date.now() % 100000 }).map((t) => ({
    ...t,
    taskId: `TSK-N${String(extraTasks.length + 1).padStart(5, '0')}`,
    title: decision.assignedTo ? t.title : `Manual allocation required — ${t.title}`,
    assignedToName: taskHolder?.name || null,
    status: 'Open',
    outcome: null,
    callConnected: null,
    nextAction: null,
    leadStatus: lead.leadStatus,
    leadStillOpen: true,
    branchCode: lead.branchCode,
    smId: lead.smId, ahId: lead.ahId, rhId: lead.rhId, zhId: lead.zhId,
    overdue: false,
    createdBy: actor?.name || 'System',
    createdOn: ts,
  }))
  extraTasks.unshift(...tasks)

  auditEvents.leadCreated(actor, lead, decision)
  bump()
  return { lead, decision, duplicate: dup, tasks, owner, taskHolder }
}

function monthLabelOf(d) {
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
  return `${M[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

/**
 * Change a lead's status, with the rules the sheet attaches to it:
 *   - Rejected / Not interested require a reason code.
 *   - Follow-up requires a next follow-up date, AND raises a follow-up task
 *     (automation 2: "on the lead moving to Follow-up status").
 * Returns { lead, task, errors }.
 */
export function changeLeadStatus(leadId, { status, reasonCode, reason, nextFollowUpDate, remark }, users, actor) {
  const lead = getLead(leadId)
  if (!lead) return { errors: { lead: 'Lead not found' } }

  const errors = {}
  if (!status) errors.status = 'Select a status'
  if (['Rejected', 'Not interested'].includes(status) && !reasonCode) errors.reasonCode = 'A reason is mandatory for this status'
  if (status === 'Follow-up' && !nextFollowUpDate) errors.nextFollowUpDate = 'A next follow-up date is mandatory'
  if (Object.keys(errors).length) return { errors }

  const wasFollowUp = lead.leadStatus === 'Follow-up'
  const contacted = ['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed'].includes(status)

  updateLead(leadId, {
    leadStatus: status,
    reasonCode: reasonCode || null,
    reason: reason || null,
    nextFollowUpDate: status === 'Follow-up' ? nextFollowUpDate : null,
    contacted: lead.contacted || contacted,
    // First response is stamped the first time contact is actually made.
    firstResponseHours:
      lead.firstResponseHours ?? (contacted ? +(Math.max(0.1, (Date.now() - new Date(lead.leadCreatedDate)) / 3600000)).toFixed(1) : null),
  }, {
    actor,
    action: `Status → ${status}`,
    detail: [reason, remark].filter(Boolean).join(' · ') || undefined,
  })

  // Automation 2 — only when it ENTERS Follow-up, not on every save.
  let task = null
  if (status === 'Follow-up' && !wasFollowUp) {
    const updated = getLead(leadId)
    const holder = updated.assignedTo || updated.parkedWith
    const who = holder ? users.find((u) => u.id === holder) : null
    task = {
      taskId: `TSK-F${String(extraTasks.length + 1).padStart(5, '0')}`,
      leadId,
      customerName: `${updated.firstName} ${updated.lastName}`,
      taskType: 'Call',
      title: 'Follow-up call',
      dueDate: nextFollowUpDate,
      dueTime: '10:00',
      priority: 'Medium',
      assignedTo: holder,
      assignedToName: who?.name || null,
      status: 'Open',
      outcome: null, callConnected: null, nextAction: null,
      nextFollowUpDate,
      attachment: null,
      createdBy: actor?.name || 'System',
      createdOn: nowStamp(),
      completedOn: null,
      automation: 'onFollowUp',
      product: updated.product,
      offerAmount: updated.offerAmount,
      leadStatus: status,
      leadStillOpen: true,
      branchCode: updated.branchCode,
      smId: updated.smId, ahId: updated.ahId, rhId: updated.rhId, zhId: updated.zhId,
      overdue: nextFollowUpDate < nowStamp().slice(0, 10),
    }
    extraTasks.unshift(task)
  }

  auditEvents.leadStatusChanged(actor, getLead(leadId), lead.leadStatus, status, reason || remark)
  bump()
  return { lead: getLead(leadId), task, errors: {} }
}

/** Patch a lead and append a timeline entry. */
export function updateLead(leadId, patch, { actor, action, detail } = {}) {
  const current = getLead(leadId)
  if (!current) return null
  const ts = nowStamp()
  const timeline = [...(current.timeline || [])]
  if (action) timeline.push({ ts, actor: actor?.name || 'System', action, detail })
  overrides.set(leadId, {
    ...(overrides.get(leadId) || {}),
    ...patch,
    timeline,
    statusUpdatedOn: ts,
    lastModifiedBy: actor?.name || 'System',
    lastModifiedOn: ts,
    daysInCurrentStatus: 0,
  })
  bump()
  return getLead(leadId)
}

/** Re-assign to another user. Returns both parties for the trigger. */
export function reassignLead(leadId, toUserId, users, actor, note) {
  const lead = getLead(leadId)
  if (!lead) return null
  const to = users.find((u) => u.id === toUserId)
  if (!to) return null
  const from = lead.assignedTo ? users.find((u) => u.id === lead.assignedTo) : null
  const sm = users.find((u) => u.id === to.managerId)
  const ah = sm ? users.find((u) => u.id === sm.managerId) : null
  const rh = ah ? users.find((u) => u.id === ah.managerId) : null
  const zh = rh ? users.find((u) => u.id === rh.managerId) : null

  updateLead(leadId, {
    assignedTo: to.id,
    assignedToName: to.name,
    smId: sm?.id || null, ahId: ah?.id || null, rhId: rh?.id || null, zhId: zh?.id || null,
    isUnallocated: false,
    parkedWith: null,
    parkedReason: null,
    assignmentOutcome: 'reassigned',
    reassignedFrom: from?.id || null,
  }, {
    actor,
    action: 'Lead re-assigned',
    detail: `${from ? from.name : 'Unallocated'} → ${to.name}${note ? ` · ${note}` : ''}`,
  })
  auditEvents.leadReassigned(actor, lead, from, to)
  return { lead: getLead(leadId), from, to }
}

/** Soft delete — the record leaves the working views but the audit trail keeps it. */
export function deleteLead(leadId, actor, reason) {
  const lead = getLead(leadId)
  if (!lead) return null
  deleted.add(leadId)
  auditEvents.leadDeleted(actor, lead, reason)
  bump()
  return { lead, actor, reason }
}

export function resetSession() {
  created.length = 0
  overrides.clear()
  deleted.clear()
  extraTasks.length = 0
  bump()
}

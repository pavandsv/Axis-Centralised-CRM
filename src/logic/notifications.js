// ---------------------------------------------------------------------------
// Notification engine. Evaluates the configured triggers against the lead book
// and produces per-recipient messages.
//
// The rule that shapes this file: a manager NEVER receives a copy of the team's
// notification. Each individual gets their own message, and the manager gets a
// SEPARATE message carrying the disclaimer. The same applies at every level up
// the chain, so an AH's roll-up is its own message too — never a CC.
// ---------------------------------------------------------------------------
import { MANAGER_EMAIL_DISCLAIMER, TRIGGER_BY_KEY, TRIGGERS } from '../config/triggers.js'
import { AGEING_DAYS, ageDays, isFollowUpDueToday, isOpen, isOverdueFollowUp } from './ageing.js'
import { formatINR } from '../theme/chartTheme.js'

const managerOf = (user, usersById) => (user?.managerId ? usersById[user.managerId] : null)

/** Walk up the reporting line, so escalations cascade "higher up in the same way". */
export function chainAbove(user, usersById, maxLevels = 6) {
  const chain = []
  let current = managerOf(user, usersById)
  let guard = 0
  while (current && guard++ < maxLevels) {
    chain.push(current)
    current = managerOf(current, usersById)
  }
  return chain
}

/**
 * Build the notification set for a given day.
 * @returns { individual: Notification[], managerDigests: Digest[] }
 */
export function buildNotifications(leads, users, today, { includePhase2 = false } = {}) {
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]))
  const individual = []
  const managerBuckets = new Map() // managerId -> { triggerKey -> leads[] }

  const addIndividual = (triggerKey, lead, userId, extra = {}) => {
    const t = TRIGGER_BY_KEY[triggerKey]
    if (!t || (t.phase === 2 && !includePhase2)) return
    individual.push({
      id: `${triggerKey}:${lead.leadId}:${userId}`,
      triggerNo: t.no,
      triggerKey,
      leadId: lead.leadId,
      userId,
      channels: t.channels,
      timing: t.timing,
      priority: extra.priority || 'medium',
      title: extra.title,
      message: extra.message,
      ts: extra.ts || `${String(today).slice(0, 10)}T09:00:00`,
      read: false,
    })
  }

  const bucketForManager = (triggerKey, lead, ownerId) => {
    const owner = usersById[ownerId]
    if (!owner) return
    // Every level above the owner gets its own separate digest — never a CC.
    for (const mgr of chainAbove(owner, usersById)) {
      if (!managerBuckets.has(mgr.id)) managerBuckets.set(mgr.id, new Map())
      const byTrigger = managerBuckets.get(mgr.id)
      if (!byTrigger.has(triggerKey)) byTrigger.set(triggerKey, [])
      byTrigger.get(triggerKey).push({ lead, owner })
    }
  }

  const todayStr = String(today).slice(0, 10)

  for (const lead of leads) {
    const owner = lead.assignedTo

    // Trigger 1 — new lead created and allocated (fires on allocation day).
    if (owner && lead.leadCreatedDate.slice(0, 10) === todayStr) {
      addIndividual('leadAllocated', lead, owner, {
        priority: 'high',
        title: 'New lead assigned',
        message: `${lead.firstName} ${lead.lastName} · ${lead.product} · ${formatINR(lead.offerAmount)} · ${lead.city}. Allocated by ${lead.assignmentRuleName || 'the routing engine'}.`,
        ts: lead.leadCreatedDate,
      })
    }

    // Trigger 2 — follow-up due today.
    if (owner && isFollowUpDueToday(lead, today)) {
      addIndividual('followUpDueToday', lead, owner, {
        priority: 'high',
        title: 'Follow-up due today',
        message: `${lead.firstName} ${lead.lastName} · ${lead.product}. Due ${lead.nextFollowUpDate}.`,
      })
    }

    // Trigger 3 — follow-up overdue while still open. Manager is informed too,
    // but through their own digest.
    if (owner && isOverdueFollowUp(lead, today)) {
      addIndividual('followUpOverdue', lead, owner, {
        priority: 'critical',
        title: 'Follow-up overdue',
        message: `${lead.firstName} ${lead.lastName} · due ${lead.nextFollowUpDate} and still open. Reminders continue daily until closed.`,
      })
      bucketForManager('followUpOverdue', lead, owner)
    }

    // Trigger 4 — still New beyond the 3-day ageing threshold.
    if (owner && lead.leadStatus === 'New' && ageDays(lead, today) >= AGEING_DAYS) {
      addIndividual('newBeyondAgeing', lead, owner, {
        priority: 'critical',
        title: `Untouched for ${ageDays(lead, today)} days`,
        message: `${lead.firstName} ${lead.lastName} · ${lead.product} is still in New status after ${ageDays(lead, today)} days (threshold ${AGEING_DAYS}).`,
      })
      bucketForManager('newBeyondAgeing', lead, owner)
    }

    // Trigger 5 — re-assignment (Phase 2 on the sheet).
    if (lead.reassignedFrom && includePhase2) {
      addIndividual('leadReassigned', lead, owner, {
        priority: 'medium',
        title: 'Lead re-assigned to you',
        message: `${lead.firstName} ${lead.lastName} moved from ${usersById[lead.reassignedFrom]?.name || lead.reassignedFrom}.`,
      })
      addIndividual('leadReassigned', lead, lead.reassignedFrom, {
        priority: 'low',
        title: 'Lead moved off your list',
        message: `${lead.firstName} ${lead.lastName} is now with ${usersById[owner]?.name || owner}.`,
      })
    }
  }

  // Roll the manager buckets into one digest per manager per trigger.
  const managerDigests = []
  for (const [managerId, byTrigger] of managerBuckets) {
    for (const [triggerKey, rows] of byTrigger) {
      const t = TRIGGER_BY_KEY[triggerKey]
      const byOwner = new Map()
      for (const { lead, owner } of rows) {
        if (!byOwner.has(owner.id)) byOwner.set(owner.id, { owner, leads: [] })
        byOwner.get(owner.id).leads.push(lead)
      }
      managerDigests.push({
        id: `digest:${triggerKey}:${managerId}`,
        managerId,
        triggerNo: t.no,
        triggerKey,
        subject: `${t.when} — ${rows.length} lead${rows.length === 1 ? '' : 's'} across your team`,
        channels: t.channels,
        // The whole point: team members are NOT copied.
        cc: [],
        disclaimer: MANAGER_EMAIL_DISCLAIMER,
        breakdown: [...byOwner.values()].map((r) => ({
          userId: r.owner.id,
          userName: r.owner.name,
          role: r.owner.role,
          count: r.leads.length,
          leadIds: r.leads.map((l) => l.leadId),
        })),
        total: rows.length,
      })
    }
  }

  return { individual, managerDigests, triggers: TRIGGERS }
}

/** Notifications for one user — their own messages plus their own digests. */
export function notificationsForUser(built, userId) {
  const own = built.individual.filter((n) => n.userId === userId)
  const digests = built.managerDigests.filter((d) => d.managerId === userId)
  return { own, digests, unread: own.filter((n) => !n.read).length + digests.length }
}

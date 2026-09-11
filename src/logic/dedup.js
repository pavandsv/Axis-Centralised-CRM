// ---------------------------------------------------------------------------
// Duplicate check — Input Sheet tab "Duplication Rules".
//
// "Only 1 duplication rule don't refer above:
//  Same campaign, same product, same LAN, same expiry → Mark as duplicate."
//
// QUESTION FOR AFL, backed by the data: a LAN only exists once a lead reaches
// Sanctioned/Disbursed, so most incoming leads have no LAN. Comparing a blank
// LAN as "same" makes the rule extremely broad — it collapses to
// campaign+product+expiry. `requireLan` lets us show AFL both readings and the
// number of leads each one flags.
// ---------------------------------------------------------------------------

const norm = (v) => (v == null || v === '' ? null : String(v).trim().toUpperCase())

/** The four-part key the rule compares on. */
export const duplicateKey = (lead) =>
  [norm(lead.campaignId), norm(lead.product), norm(lead.lanNo), norm(lead.offerValidTill)].join('|')

/**
 * Group leads into duplicate sets.
 * @param requireLan when true, only leads that actually carry a LAN are eligible
 *                   (the narrow reading). When false, a blank LAN counts as a
 *                   value and matches other blanks (the literal reading).
 */
export function findDuplicates(leads, { requireLan = true } = {}) {
  const groups = new Map()
  for (const lead of leads) {
    if (requireLan && !norm(lead.lanNo)) continue
    const key = duplicateKey(lead)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(lead)
  }
  const sets = [...groups.entries()]
    .filter(([, rows]) => rows.length > 1)
    .map(([key, rows]) => {
      // Earliest created is the original; the rest are the duplicates.
      const ordered = [...rows].sort((a, b) => a.leadCreatedDate.localeCompare(b.leadCreatedDate))
      return { key, original: ordered[0], duplicates: ordered.slice(1) }
    })
  return sets
}

/** Would this incoming lead be a duplicate of anything already on file? */
export function checkIncoming(lead, existingLeads, { requireLan = true } = {}) {
  if (requireLan && !norm(lead.lanNo)) {
    return { isDuplicate: false, reason: 'No LAN on the incoming lead — rule not applicable' }
  }
  const key = duplicateKey(lead)
  const match = existingLeads.find((l) => l.leadId !== lead.leadId && duplicateKey(l) === key)
  return match
    ? {
        isDuplicate: true,
        matchedLeadId: match.leadId,
        reason: 'Same campaign, same product, same LAN, same expiry',
        action: 'Mark as duplicate',
      }
    : { isDuplicate: false }
}

/** Impact comparison, so AFL can pick a reading with the numbers in front of them. */
export function compareReadings(leads) {
  const narrow = findDuplicates(leads, { requireLan: true })
  const literal = findDuplicates(leads, { requireLan: false })
  const count = (sets) => sets.reduce((n, s) => n + s.duplicates.length, 0)
  return {
    narrow: { sets: narrow.length, flagged: count(narrow) },
    literal: { sets: literal.length, flagged: count(literal) },
  }
}

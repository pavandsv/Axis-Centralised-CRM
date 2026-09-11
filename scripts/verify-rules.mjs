// Verifies the implemented rules against the AFL Requirement Input Sheet.
import { LEADS } from '../src/data/generated/leads.js'
import { USERS } from '../src/data/generated/org.js'
import { ACTIONS, PERMISSIONS, ROLES, ROLE_CODES, can, canDownloadPii } from '../src/config/roles.js'
import { visibleLeads, scopeDescription, exportableFields, subordinates } from '../src/logic/visibility.js'
import { assignLead, openLeadCounts } from '../src/logic/assignment.js'
import { ASSIGNMENT_RULES } from '../src/config/assignmentRules.js'
import { compareReadings, findDuplicates } from '../src/logic/dedup.js'
import { buildNotifications, notificationsForUser } from '../src/logic/notifications.js'
import { TRIGGERS } from '../src/config/triggers.js'
import { OPEN_STATUSES } from '../src/logic/ageing.js'

const TODAY = '2026-09-10'
let fails = 0
const ok = (label, cond, detail = '') => {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`)
  if (!cond) fails++
}
const pick = (role) => USERS.find((u) => u.role === role)

console.log('1. DATA VISIBILITY — "Can see data of" column')
const rows = []
for (const role of ROLE_CODES) {
  const u = pick(role)
  if (!u) continue
  const n = visibleLeads(u, LEADS).length
  rows.push([role, u.name, n, scopeDescription(u)])
}
for (const [role, name, n, scope] of rows) {
  console.log(`     ${role.padEnd(13)} ${String(n).padStart(5)} leads   ${scope}`)
}
const byRole = Object.fromEntries(rows.map((r) => [r[0], r[2]]))
ok('DST sees strictly fewer than its SM', byRole.DST < byRole.SM, `${byRole.DST} < ${byRole.SM}`)
ok('SM sees fewer than its AH', byRole.SM < byRole.AH, `${byRole.SM} < ${byRole.AH}`)
ok('AH sees fewer than its RH', byRole.AH < byRole.RH, `${byRole.AH} < ${byRole.RH}`)
ok('RH sees fewer than its ZH', byRole.RH < byRole.ZH, `${byRole.RH} < ${byRole.ZH}`)
ok('ZH sees fewer than the whole book', byRole.ZH < LEADS.length, `${byRole.ZH} < ${LEADS.length}`)
ok('BH and NH see the entire organisation', byRole.BH === LEADS.length && byRole.NH === LEADS.length)
ok('HO / Product Team / Super User see pan organisation',
   byRole.HO === LEADS.length && byRole.PRODUCT_TEAM === LEADS.length && byRole.SUPER === LEADS.length)
ok('IT Team sees NO customer data', byRole.IT === 0)
const dst = pick('DST')
ok('every lead a DST sees is their own', visibleLeads(dst, LEADS).every((l) => l.assignedTo === dst.id))
const sm = USERS.find((u) => u.role === 'SM' && LEADS.some((l) => l.smId === u.id))
const smTeam = new Set(subordinates(sm, USERS).map((u) => u.id))
ok("every lead an SM sees belongs to their own team",
   visibleLeads(sm, LEADS).every((l) => smTeam.has(l.assignedTo) || l.parkedWith === sm.id))

console.log('\n2. PERMISSION MATRIX — 11 roles x 11 actions')
ok('matrix covers all 11 roles', Object.keys(PERMISSIONS).length === 11)
ok('DST cannot view team leads', !can('DST', 'viewTeamLeads'))
ok('DST cannot re-assign', !can('DST', 'reassignLead'))
ok('SM cannot download reports', !can('SM', 'downloadReports'))
ok('only Product Team, HO and Super User may upload Excel',
   ROLE_CODES.filter((r) => can(r, 'uploadExcel')).join(',') === 'HO,PRODUCT_TEAM,SUPER')
ok('only IT and Super User hold UAM',
   ROLE_CODES.filter((r) => can(r, 'uam')).sort().join(',') === 'IT,SUPER')
ok('only Product Team, HO and Super User may delete a lead',
   ROLE_CODES.filter((r) => can(r, 'deleteLead')).join(',') === 'HO,PRODUCT_TEAM,SUPER')
ok('Customer 360 is limited to BH, Product Team, HO, Super User',
   ROLE_CODES.filter((r) => can(r, 'viewCustomer360')).sort().join(',') === 'BH,HO,PRODUCT_TEAM,SUPER')
ok('IT Team has no lead access at all',
   ACTIONS.filter((a) => a.key !== 'uam').every((a) => !can('IT', a.key)))

console.log('\n3. DPDP — "Phone no and Address details cannot be downloadable from DST to RH"')
const fields = ['leadId', 'firstName', 'mobileNumber', 'alternateMobile', 'pincode', 'product']
for (const role of ['DST', 'SM', 'AH', 'RH', 'ZH', 'NH', 'BH', 'HO']) {
  const f = exportableFields(role, fields)
  const hasPii = f.includes('mobileNumber') || f.includes('pincode')
  console.log(`     ${role.padEnd(5)} export ${f.length ? f.join(', ') : '(no download permission)'}`)
  if (['DST', 'SM', 'AH', 'RH'].includes(role) && hasPii) { console.log('       ^ LEAK'); fails++ }
}
ok('DST→RH cannot download phone or address', ['DST', 'SM', 'AH', 'RH'].every((r) => !canDownloadPii(r)))
ok('ZH and above can', ['ZH', 'NH', 'BH', 'HO', 'SUPER'].every((r) => canDownloadPii(r)))

console.log('\n4. ASSIGNMENT — rules read top to bottom, first match wins')
const used = {}
for (const l of LEADS) used[l.assignmentRuleNo] = (used[l.assignmentRuleNo] || 0) + 1
for (const r of ASSIGNMENT_RULES) {
  const n = used[r.no] || 0
  console.log(`     Rule ${r.no}  ${r.name.padEnd(32)} ${String(n).padStart(5)} leads${r.open ? '   (AFL confirmation pending)' : ''}`)
}
ok('rule 1 placed leads at single-user branches', (used[1] || 0) > 0, `${used[1]} leads`)
ok('rule 2 placed leads where a pool exists', (used[2] || 0) > 0, `${used[2]} leads`)
ok('rule 3 parked every out-of-geography lead',
   LEADS.filter((l) => l.assignmentRuleNo === 3).every((l) => l.assignmentOutcome !== 'assigned'))
ok('every parked lead names who holds it',
   LEADS.filter((l) => l.assignmentOutcome === 'parked').every((l) => !!l.parkedWith))
ok('no assigned lead sits with an inactive user',
   LEADS.filter((l) => l.assignedTo).every((l) => USERS.find((u) => u.id === l.assignedTo)?.status !== 'Inactive'))
ok('every assigned lead went to a DST at the lead\'s own branch, or a vertical specialist',
   LEADS.filter((l) => l.assignedTo && l.assignmentRuleNo !== 4).every((l) => {
     const u = USERS.find((x) => x.id === l.assignedTo)
     return u && u.role === 'DST' && u.branchCode === l.branchCode
   }))

// Balanced strategy: re-run the engine on a fresh pool and confirm it spreads.
const pool = USERS.filter((u) => u.role === 'DST' && u.branchCode === 'BR-MUM-01' && u.status === 'Active')
if (pool.length > 1) {
  const counts = {}
  const cursor = {}
  for (let i = 0; i < 40; i++) {
    const d = assignLead({ pincode: '400051', product: 'Kushal Personal Loan' }, USERS, { openLeadCountByUser: counts, rotationCursor: cursor })
    counts[d.assignedTo] = (counts[d.assignedTo] || 0) + 1
  }
  const spread = Object.values(counts)
  ok('balanced strategy spreads evenly across a pool', Math.max(...spread) - Math.min(...spread) <= 1,
     `${pool.length} users got ${spread.join(' / ')} of 40`)
}

console.log('\n5. DE-DUPLICATION — same campaign, same product, same LAN, same expiry')
const cmp = compareReadings(LEADS)
console.log(`     narrow reading (LAN must exist)  ${cmp.narrow.sets} sets, ${cmp.narrow.flagged} leads flagged`)
console.log(`     literal reading (blank LAN matches) ${cmp.literal.sets} sets, ${cmp.literal.flagged} leads flagged`)
ok('the rule is implemented and runs', Number.isInteger(cmp.narrow.flagged))
ok('the two readings differ, so the choice matters to AFL', cmp.literal.flagged !== cmp.narrow.flagged)

console.log('\n6. TRIGGERS — individual messages, managers never CC\'d')
const built = buildNotifications(LEADS, USERS, TODAY)
const byTrigger = {}
for (const n of built.individual) byTrigger[n.triggerKey] = (byTrigger[n.triggerKey] || 0) + 1
for (const t of TRIGGERS) {
  const n = byTrigger[t.key] || 0
  const flags = [t.phase === 2 ? 'Phase 2' : null, t.open ? 'timing pending AFL' : null].filter(Boolean)
  console.log(`     Trigger ${t.no}  ${t.key.padEnd(18)} ${String(n).padStart(5)} messages   ${t.channels.join(' + ')}${flags.length ? '   (' + flags.join(', ') + ')' : ''}`)
}
ok('trigger 1 fires for leads allocated today', (byTrigger.leadAllocated || 0) > 0)
ok('trigger 3 fires for overdue follow-ups', (byTrigger.followUpOverdue || 0) > 0)
ok('trigger 4 fires for leads New beyond 3 days', (byTrigger.newBeyondAgeing || 0) > 0)
ok('phase 2 trigger 5 is withheld by default', (byTrigger.leadReassigned || 0) === 0)
ok('every individual message is addressed to exactly one user',
   built.individual.every((n) => typeof n.userId === 'string' && n.userId.length > 0))
ok('no message uses SMS or WhatsApp (out of Phase 1 scope)',
   built.individual.every((n) => n.channels.every((c) => ['In-app', 'Email'].includes(c))))

console.log(`\n     manager digests generated: ${built.managerDigests.length}`)
ok('every manager digest has an EMPTY cc list', built.managerDigests.every((d) => d.cc.length === 0))
ok('every manager digest carries the disclaimer',
   built.managerDigests.every((d) => d.disclaimer && d.disclaimer.includes('not copied')))
ok('digests break down per team member, not as one blob',
   built.managerDigests.every((d) => d.breakdown.length > 0 && d.breakdown.every((b) => b.userId && b.count > 0)))

// The escalation must cascade upward: a DST's overdue lead should surface to the
// SM, and to the AH above them, as separate messages.
const overdue = LEADS.find((l) => l.leadStatus === 'Follow-up' && l.nextFollowUpDate < TODAY && l.assignedTo)
if (overdue) {
  const owner = USERS.find((u) => u.id === overdue.assignedTo)
  const chain = []
  let cur = owner
  while (cur?.managerId) { cur = USERS.find((u) => u.id === cur.managerId); if (cur) chain.push(cur) }
  const reached = chain.filter((m) => built.managerDigests.some((d) => d.managerId === m.id && d.breakdown.some((b) => b.leadIds.includes(overdue.leadId))))
  console.log(`     escalation chain for ${overdue.leadId}: ${owner.name} (DST) → ${chain.map((c) => c.role).join(' → ')}`)
  ok('overdue lead cascades to every level above the owner', reached.length === chain.length,
     `${reached.length} of ${chain.length} levels notified separately`)
}

const someSm = built.managerDigests.find((d) => USERS.find((u) => u.id === d.managerId)?.role === 'SM')
if (someSm) {
  const view = notificationsForUser(built, someSm.managerId)
  const mgr = USERS.find((u) => u.id === someSm.managerId)
  console.log(`\n     example — ${mgr.name} (${mgr.role}): ${view.own.length} own message(s), ${view.digests.length} team digest(s)`)
  console.log(`     digest subject: "${someSm.subject}"`)
  console.log(`     cc: ${someSm.cc.length === 0 ? '(nobody — team not copied)' : someSm.cc.join(',')}`)
}

console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL RULE CHECKS PASS')
process.exit(fails ? 1 : 0)

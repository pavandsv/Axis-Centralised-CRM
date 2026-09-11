import { USERS } from '../src/data/generated/org.js'
import {
  widgets, widgetLeads, widgetUsers, leadsByProduct, ageingLeads, ageingBucketLeads,
  dataQualityByReason, slaCompliance, campaignPerformance, teamProductivity,
  unallocatedLeads, overdueFollowUps, scopedLeads, resolveRange, TODAY,
} from '../src/data/crm.js'

const range = resolveRange('YTD', { from: '2026-04-01', to: TODAY })
const fails = []
const note = (m) => fails.push(m)

for (const role of ['SUPER', 'HO', 'PRODUCT_TEAM', 'BH', 'NH', 'ZH', 'RH', 'AH', 'SM', 'DST']) {
  const u = USERS.find((x) => x.role === role)
  if (!u) continue
  const book = scopedLeads(u)
  const inRange = scopedLeads(u, range)

  // 1. every widget's value must equal what clicking it returns
  for (const w of widgets(u, range)) {
    const drilled = widgetLeads(u, range, w.key).length
    if (w.key === 'users') {
      // The Users tile resolves to people. Its value is the ACTIVE count, so
      // the drawer may legitimately list more rows (it includes inactive).
      const people = widgetUsers(u)
      const activeShown = people.filter((x) => x.status !== 'Inactive').length
      if (drilled !== 0) note(`${role} "users" still resolves to ${drilled} leads`)
      if (activeShown !== w.value) note(`${role} "users": tile ${w.value}, drawer shows ${activeShown} active`)
      if (people.some((x) => x.leadId)) note(`${role} "users" drawer contains lead records`)
      continue
    }
    if (drilled !== w.value) note(`${role} widget "${w.key}": value ${w.value}, drill ${drilled}`)

    // Each tile must list EXACTLY the statuses it names. Cumulative funnel
    // reach used to put disbursed leads inside Contacted and Qualified.
    const ALLOWED = {
      openLeads: ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned'],
      untouched: ['New'],
      contacted: ['Not interested', 'Follow-up', 'Login Initiated'],
      qualified: ['Sanctioned'],
      disbursed: ['Disbursed'],
    }[w.key]
    if (ALLOWED) {
      const stray = [...new Set(widgetLeads(u, range, w.key).map((l) => l.leadStatus))]
        .filter((st) => !ALLOWED.includes(st))
      if (stray.length) note(`${role} widget "${w.key}" returns out-of-scope statuses: ${stray.join(', ')}`)
    }
  }

  // 2. chart totals must not exceed the book they claim to describe
  const prod = leadsByProduct(inRange)
  const prodSum = prod.reduce((a, r) => a + r.value, 0)
  if (prodSum !== inRange.length) note(`${role} product chart sums ${prodSum} vs ${inRange.length} in range`)

  const age = ageingLeads(book)
  const ageSum = age.reduce((a, b) => a + b.count, 0)
  const openCount = book.filter((l) => ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned'].includes(l.leadStatus)).length
  if (ageSum !== openCount) note(`${role} ageing buckets sum ${ageSum} vs ${openCount} open`)
  for (const b of age) {
    const d = ageingBucketLeads(book, b.label).length
    if (d !== b.count) note(`${role} ageing bucket "${b.label}": chart ${b.count}, drill ${d}`)
  }

  const camp = campaignPerformance(inRange)
  const campSum = camp.reduce((a, c) => a + c.leads, 0)
  if (campSum !== inRange.length) note(`${role} campaigns sum ${campSum} vs ${inRange.length} in range`)

  const team = teamProductivity(u, book)
  const teamSum = team.reduce((a, t) => a + t.leads, 0)
  if (teamSum > book.length) note(`${role} team productivity sums ${teamSum} > book ${book.length}`)

  const unal = unallocatedLeads(book)
  if (unal.some((l) => l.assignedTo)) note(`${role} unallocated list contains assigned leads`)

  const od = overdueFollowUps(book)
  if (od.some((l) => !l.nextFollowUpDate)) note(`${role} overdue list contains leads with no follow-up date`)

  const sla = slaCompliance(book)
  if (sla.compliance < 0 || sla.compliance > 100) note(`${role} SLA compliance out of range: ${sla.compliance}`)

  const dq = dataQualityByReason(book)
  const dqSum = dq.reduce((a, r) => a + r.value, 0)
  const withReason = book.filter((l) => l.reasonCode).length
  if (dqSum > withReason) note(`${role} DQ sums ${dqSum} > ${withReason} leads carrying a reason`)

  console.log(`${role.padEnd(13)} book ${String(book.length).padStart(4)} · in-range ${String(inRange.length).padStart(4)} · users widget ${widgets(u, range)[0].value}`)
}

console.log('\n' + (fails.length ? `${fails.length} PROBLEM(S):` : 'no problems found'))
for (const f of fails) console.log('  ✗ ' + f)

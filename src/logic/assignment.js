// ---------------------------------------------------------------------------
// The assignment engine. Evaluates the Input Sheet's rules in order and returns
// a decision plus the trace of how it got there — the trace is what makes this
// demonstrable to the client rather than a black box.
// ---------------------------------------------------------------------------
import {
  ASSIGNMENT_RULES,
  DEFAULT_STRATEGY,
  SELECTION_STRATEGY,
  VERTICAL_TEAM_PRODUCTS,
} from '../config/assignmentRules.js'
import { resolvePincode } from '../data/geography.js'

/**
 * @param lead      { pincode, product, ... }
 * @param users     the full user master
 * @param context   { openLeadCountByUser, rotationCursor, strategy }
 * @returns { assignedTo, ruleNo, ruleName, outcome, parkedWith, reason, trace, poolSize }
 */
export function assignLead(lead, users, context = {}) {
  const {
    openLeadCountByUser = {},
    rotationCursor = {},
    strategy = DEFAULT_STRATEGY,
  } = context

  const trace = []
  const note = (ruleNo, text, matched) => trace.push({ ruleNo, text, matched })

  const geo = resolvePincode(lead.pincode)
  const active = (u) => u.status !== 'Inactive'

  // ---- Rule 4 first when a product belongs to a dedicated vertical team.
  // The sheet orders it 4th, but its condition is product-based and independent
  // of geography, so a geography match would otherwise always pre-empt it.
  // Flagged for AFL: confirm whether vertical routing outranks geography.
  const vertical = VERTICAL_TEAM_PRODUCTS[lead.product]
  if (vertical) {
    const team = users.filter((u) => u.verticalTeam === vertical.team && active(u))
    note(4, `Product "${lead.product}" is routed to ${vertical.team}`, true)
    if (team.length) {
      const chosen = select(team, { openLeadCountByUser, rotationCursor, strategy, key: vertical.team })
      return decision(chosen.id, 4, 'assigned', { trace, poolSize: team.length, strategy: chosen.how })
    }
    const vh = users.find((u) => u.role === 'NH' && active(u))
    note(4, 'No vertical team member available — parking with the Vertical Head', true)
    return decision(null, 4, 'parked', { trace, parkedWith: vh?.id || null, reason: 'No vertical team member available' })
  }
  note(4, 'Product is not mapped to a dedicated vertical team', false)

  // ---- Rule 3: out-of-geography.
  if (!geo || !geo.branchCode) {
    note(3, `Pincode ${lead.pincode} does not match any mapped branch or region`, true)
    const zh = users.find((u) => u.role === 'ZH' && active(u))
    if (zh) {
      return decision(null, 3, 'parked', {
        trace,
        parkedWith: zh.id,
        reason: 'Out-of-geography — parked with Zonal Head for manual allocation',
      })
    }
    const vh = users.find((u) => u.role === 'NH' && active(u))
    note(3, 'No Zonal Head available — escalating to the Vertical Head', true)
    return decision(null, 3, 'escalated', {
      trace,
      parkedWith: vh?.id || null,
      reason: 'Out-of-geography and no Zonal Head available',
    })
  }
  note(3, `Pincode ${lead.pincode} resolves to ${geo.branch}`, false)

  // ---- Rules 1 + 2: geography match, then selection within the pool.
  // Rule 5 applies here as a filter: an inactive user is never allocated to.
  // Allocation pool is the branch's DSTs (and Sales Officers, once AFL separates
  // SO from SM — the sheet currently pairs them in one level). The Sales Manager
  // is the PARKING target per rule 1's fallback, so they are not in the pool.
  const eligible = users.filter(
    (u) => u.role === 'DST' && u.branchCode === geo.branchCode && handlesProduct(u, lead.product),
  )
  const availablePool = eligible.filter(active)
  const inactiveCount = eligible.length - availablePool.length
  if (inactiveCount) note(5, `${inactiveCount} mapped user(s) skipped as inactive`, true)

  if (availablePool.length === 1) {
    note(1, `Single mapped user at ${geo.branch} for ${lead.product}`, true)
    return decision(availablePool[0].id, 1, 'assigned', { trace, poolSize: 1, strategy: 'only eligible user' })
  }

  if (availablePool.length > 1) {
    note(1, `${availablePool.length} users mapped to ${geo.branch} for ${lead.product}`, true)
    note(2, `Selecting within the pool using "${strategy}"`, true)
    const chosen = select(availablePool, {
      openLeadCountByUser,
      rotationCursor,
      strategy,
      key: `${geo.branchCode}|${lead.product}`,
    })
    return decision(chosen.id, 2, 'assigned', { trace, poolSize: availablePool.length, strategy: chosen.how })
  }

  // Nobody available → park with the Sales Manager of that branch.
  const sm = users.find((u) => u.role === 'SM' && u.branchCode === geo.branchCode && active(u))
  note(1, 'No eligible user available — parking with the branch Sales Manager', true)
  return decision(null, 1, 'parked', {
    trace,
    parkedWith: sm?.id || null,
    reason: `No available user for ${lead.product} at ${geo.branch}`,
  })
}

const handlesProduct = (user, product) =>
  !user.products || user.products.length === 0 || user.products.includes(product)

/** Pick one user from the pool per the configured strategy. */
function select(pool, { openLeadCountByUser, rotationCursor, strategy, key }) {
  const load = (u) => openLeadCountByUser[u.id] ?? 0

  if (strategy === SELECTION_STRATEGY.ROUND_ROBIN) {
    const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id))
    const cursor = rotationCursor[key] ?? 0
    const chosen = sorted[cursor % sorted.length]
    rotationCursor[key] = cursor + 1
    return { ...chosen, how: `round robin (position ${(cursor % sorted.length) + 1} of ${sorted.length})` }
  }

  if (strategy === SELECTION_STRATEGY.LOAD_BASED) {
    const sorted = [...pool].sort((a, b) => load(a) - load(b) || a.id.localeCompare(b.id))
    return { ...sorted[0], how: `load based (${load(sorted[0])} open leads, lowest in pool)` }
  }

  // BALANCED — the MOM direction: rotate, but only among the least loaded, so a
  // lead routes to whoever is more free where several users cover the pincode.
  const minLoad = Math.min(...pool.map(load))
  const freest = pool.filter((u) => load(u) === minLoad).sort((a, b) => a.id.localeCompare(b.id))
  const cursor = rotationCursor[key] ?? 0
  const chosen = freest[cursor % freest.length]
  rotationCursor[key] = cursor + 1
  return {
    ...chosen,
    how: `balanced — ${minLoad} open leads (fewest of ${pool.length}), rotation ${(cursor % freest.length) + 1}/${freest.length}`,
  }
}

function decision(assignedTo, ruleNo, outcome, extra = {}) {
  const rule = ASSIGNMENT_RULES.find((r) => r.no === ruleNo)
  return {
    assignedTo,
    ruleNo,
    ruleName: rule?.name,
    outcome, // assigned | parked | escalated
    parkedWith: extra.parkedWith ?? null,
    reason: extra.reason ?? null,
    poolSize: extra.poolSize ?? 0,
    strategy: extra.strategy ?? null,
    trace: extra.trace ?? [],
  }
}

/** Open-lead counts per user, the input the balanced strategy needs. */
export function openLeadCounts(leads, openStatuses) {
  const counts = {}
  for (const l of leads) {
    if (!l.assignedTo) continue
    if (openStatuses && !openStatuses.includes(l.leadStatus)) continue
    counts[l.assignedTo] = (counts[l.assignedTo] || 0) + 1
  }
  return counts
}

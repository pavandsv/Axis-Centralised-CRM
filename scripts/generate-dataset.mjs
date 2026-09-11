// ---------------------------------------------------------------------------
// Dataset generator, rebuilt against the AFL Requirement Input Sheet.
//
//  * 11-role hierarchy (BH → NH → ZH → RH → AH → SM → DST, plus HO, Product
//    Team, IT and Super User) with a managerId on every user.
//  * Every lead is routed through the REAL assignment engine, so the data and
//    the running app agree — and each lead records which rule placed it.
//  * Ageing/SLA use AFL's 3-day rule, not the mockup's invented 2-hour SLA.
//
// Deterministic: same seed, same dataset, every run.
//   node scripts/generate-dataset.mjs
// ---------------------------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import { BRANCHES, UNMAPPED_PINCODES, resolvePincode } from '../src/data/geography.js'
import { PRODUCTS, LEAD_SOURCES, OCCUPATIONS, OCCUPATION_EMPLOYMENT, REASONS, formatLeadId } from '../src/data/masters.js'
import { assignLead, openLeadCounts } from '../src/logic/assignment.js'
import { DEFAULT_STRATEGY } from '../src/config/assignmentRules.js'
import { AGEING_DAYS } from '../src/logic/ageing.js'
import { NAME_POOLS, STATE_TO_POOL } from './name-pools.mjs'

const CONFIG = {
  seed: 20260910,
  leadCount: 1500,
  monthsOfHistory: 12,
  // End of the demo day, matching src/logic/ageing.js's anchor(), so the
  // stored day-counts and the runtime ones can never drift apart.
  today: new Date('2026-09-10T23:59:59'),
  outDir: 'src/data/generated',
  inactiveShare: 0.04, // a few users inactive, to exercise assignment rule 5
}

// ----------------------------------------------------------------- utilities
let _s = CONFIG.seed
const rnd = () => {
  _s |= 0; _s = (_s + 0x6d2b79f5) | 0
  let t = Math.imul(_s ^ (_s >>> 15), 1 | _s)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1))
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]
const chance = (p) => rnd() < p
const weighted = (pairs) => {
  const total = pairs.reduce((s, [, w]) => s + w, 0)
  let r = rnd() * total
  for (const [v, w] of pairs) if ((r -= w) <= 0) return v
  return pairs[pairs.length - 1][0]
}
const p2 = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}T${p2(d.getHours())}:${p2(d.getMinutes())}:00`
const isoDate = (d) => iso(d).slice(0, 10)
const addDays = (d, n) => new Date(d.getTime() + n * 86400000)
const addHours = (d, n) => new Date(d.getTime() + n * 3600000)
const personName = (state) => {
  const pool = NAME_POOLS[STATE_TO_POOL[state] || 'north']
  return `${pick(pool.first)} ${pick(pool.last)}`
}
const initials = (n) => n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const slug = (n) => n.toLowerCase().replace(/[^a-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).join('.')

// ------------------------------------------------- 1. the 11-role hierarchy
const users = []
const emails = new Set()
let seq = { NH: 0, ZH: 0, RH: 0, AH: 0, SM: 0, DST: 0, HO: 0, PRODUCT_TEAM: 0, IT: 0 }

function addUser({ role, name, managerId = null, ...rest }) {
  let email = `${slug(name)}@axisfinance.in`
  let n = 2
  while (emails.has(email)) email = `${slug(name)}${n++}@axisfinance.in`
  emails.add(email)
  const id = role === 'BH' ? 'bh-001'
    : role === 'SUPER' ? 'super-001'
    : `${role.toLowerCase().replace('_', '-')}-${String(++seq[role]).padStart(3, '0')}`
  const user = {
    id, role, name, managerId,
    email, avatar: initials(name), password: 'Demo@123',
    phone: `+91 ${int(70, 99)}${int(100, 999)} ${int(10000, 99999)}`,
    joiningDate: isoDate(addDays(CONFIG.today, -int(200, 2600))),
    status: 'Active',
    ...rest,
  }
  users.push(user)
  return user
}

const PORTFOLIO_LIST = [...new Set(PRODUCTS.map((p) => p.portfolio))]
const zoneNames = [...new Set(BRANCHES.map((b) => b.zone))]
const regionsOfZone = (z) => [...new Set(BRANCHES.filter((b) => b.zone === z).map((b) => b.region))]
const METRO = new Set(['Mumbai', 'New Delhi', 'Bengaluru', 'Chennai', 'Hyderabad', 'Pune', 'Kolkata', 'Ahmedabad'])

const bh = addUser({ role: 'BH', name: personName('Maharashtra'), city: 'Mumbai', scopeLabel: 'Entire organisation' })
const superUser = addUser({ role: 'SUPER', name: personName('Maharashtra'), city: 'Mumbai', scopeLabel: 'Pan organisation' })

// Two National / Vertical Heads under the BH.
const nhs = [
  addUser({ role: 'NH', name: personName('Maharashtra'), managerId: bh.id, city: 'Mumbai', vertical: 'Retail Assets', scopeLabel: 'Entire organisation' }),
  addUser({ role: 'NH', name: personName('Delhi'), managerId: bh.id, city: 'New Delhi', vertical: 'Secured & Business', scopeLabel: 'Entire organisation' }),
]

const dstsByBranch = {}
zoneNames.forEach((zone, zi) => {
  const nh = nhs[zi % nhs.length]
  const anyBranch = BRANCHES.find((b) => b.zone === zone)
  const zh = addUser({
    role: 'ZH', name: personName(anyBranch.state), managerId: nh.id,
    zone, city: anyBranch.city, scopeLabel: `${zone} and everyone below`,
  })

  for (const region of regionsOfZone(zone)) {
    const regionBranches = BRANCHES.filter((b) => b.region === region)
    const rh = addUser({
      role: 'RH', name: personName(regionBranches[0].state), managerId: zh.id,
      zone, region, city: regionBranches[0].city, scopeLabel: `${region} and everyone below`,
    })

    for (let c = 0; c < regionBranches.length; c += 3) {
      const cluster = regionBranches.slice(c, c + 3)
      const area = `${cluster[0].city} Area`
      const ah = addUser({
        role: 'AH', name: personName(cluster[0].state), managerId: rh.id,
        zone, region, area, city: cluster[0].city,
        branchCodes: cluster.map((b) => b.code), scopeLabel: `${area} and everyone below`,
      })

      for (const branch of cluster) {
        const sm = addUser({
          role: 'SM', name: personName(branch.state), managerId: ah.id,
          zone, region, area, branch: branch.branch, branchCode: branch.code,
          city: branch.city, scopeLabel: 'Own team',
        })
        // Each branch fields 1–2 DSTs; metros get two, each on its own products
        // so assignment rule 1 (single mapped user) and rule 2 (round robin
        // within a pool) both occur naturally in the data.
        const dstCount = METRO.has(branch.city) ? 2 : 1
        dstsByBranch[branch.code] = []
        for (let k = 0; k < dstCount; k++) {
          const dst = addUser({
            role: 'DST', name: personName(branch.state), managerId: sm.id,
            zone, region, area, branch: branch.branch, branchCode: branch.code,
            city: branch.city, team: `${branch.city} Team ${k + 1}`,
            products: [], // empty = handles all products at this branch
            scopeLabel: 'Own leads only',
          })
          dstsByBranch[branch.code].push(dst.id)
        }
      }
    }
  }
})

// Central roles. MOM: 8–9 HO users on differing product entitlements, so each
// HO user carries an explicit product-entitlement list.
for (let i = 0; i < 8; i++) {
  addUser({
    role: 'HO', name: personName('Maharashtra'), managerId: null, city: 'Mumbai',
    entitlement: 'all',
    portfolios: i < 2 ? PORTFOLIO_LIST : [PORTFOLIO_LIST[i % PORTFOLIO_LIST.length], PORTFOLIO_LIST[(i + 1) % PORTFOLIO_LIST.length]],
    scopeLabel: 'Pan organisation',
  })
}
for (let i = 0; i < 3; i++) {
  addUser({ role: 'PRODUCT_TEAM', name: personName('Karnataka'), city: 'Bengaluru', scopeLabel: 'Pan organisation' })
}

// Vertical specialists, so assignment rule 4 (product specific routing) actually
// allocates instead of parking everything with the Vertical Head. The product →
// team mapping itself is still owed by AFL, so these two teams are illustrative.
const VERTICAL_TEAMS = ['LRD Vertical', 'Capital Markets Vertical']
VERTICAL_TEAMS.forEach((team, ti) => {
  for (let k = 0; k < 2; k++) {
    addUser({
      role: 'DST', name: personName(k ? 'Maharashtra' : 'Delhi'),
      managerId: nhs[1].id, verticalTeam: team,
      city: k ? 'Mumbai' : 'New Delhi', team,
      products: [], scopeLabel: 'Own leads only',
    })
  }
})
for (let i = 0; i < 2; i++) {
  addUser({ role: 'IT', name: personName('Telangana'), city: 'Hyderabad', scopeLabel: 'Audit and config only — no customer data' })
}

// Mark a few sales users inactive so assignment rule 5 has something to skip.
const salesForce = users.filter((u) => ['DST', 'SM'].includes(u.role))
const inactiveTarget = Math.max(2, Math.round(salesForce.length * CONFIG.inactiveShare))
for (let i = 0; i < inactiveTarget; i++) {
  const u = salesForce[Math.floor(rnd() * salesForce.length)]
  if (u.role === 'DST' && dstsByBranch[u.branchCode]?.length > 1) u.status = 'Inactive'
}

// ------------------------------------------------------- 2. campaign master
const CAMPAIGN_THEMES = [
  { theme: 'Diwali Dhamaka', products: ['Diwali Special Loan', 'Consumer Durable Loan', 'Two-Wheeler Loan'], months: [9, 10] },
  { theme: 'Shiksha Education', products: ['Education Loan'], months: [4, 5, 6, 7] },
  { theme: 'Shubh Vivah', products: ['Marriage Loan'], months: [10, 11, 0, 1] },
  { theme: 'Ghar Ka Sapna', products: ['Home Purchase Loan', 'Disha Home Loan', 'Plot + Construction Loan'], months: [8, 9, 10, 2] },
  { theme: 'Vyapar Vriddhi', products: ['Vyapar Business Loan', 'Working Capital Loan', 'MSME Growth Loan'], months: [0, 1, 2] },
  { theme: 'Property Power', products: ['Loan Against Property', 'MLAP (Shakti)'], months: [3, 4, 5] },
  { theme: 'Swasthya Care', products: ['Medical Emergency Loan'], months: [6, 7, 8] },
  { theme: 'Balance Transfer Bonanza', products: ['Home Loan Balance Transfer', 'Debt Consolidation Loan'], months: [0, 1, 5, 6] },
  { theme: 'Gold Utsav', products: ['Gold Loan'], months: [3, 9, 10] },
  { theme: 'Professional Edge', products: ['Doctor Professional Loan', 'CA / Professional Loan'], months: [1, 2, 7, 8] },
  { theme: 'Safar Travel', products: ['Travel Loan'], months: [2, 3, 9] },
  { theme: 'Grah Sajawat', products: ['Home Renovation Loan'], months: [8, 9, 10] },
]
const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const startMonth = new Date(CONFIG.today.getFullYear(), CONFIG.today.getMonth() - (CONFIG.monthsOfHistory - 1), 1)
const monthKeys = []
for (let i = 0; i < CONFIG.monthsOfHistory; i++) {
  const d = new Date(startMonth.getFullYear(), startMonth.getMonth() + i, 1)
  monthKeys.push({ y: d.getFullYear(), m: d.getMonth(), label: `${MONTH_ABBR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` })
}
const campaigns = []
let ci = 0
for (const { y, m, label } of monthKeys) {
  for (const t of CAMPAIGN_THEMES) {
    if (!t.months.includes(m)) continue
    const source = weighted([['Social media', 4], ['PQ Campaign', 3], ['Landing page', 3], ['Website', 2]])
    campaigns.push({
      campaignId: `CMP-${y}-${String(++ci).padStart(4, '0')}`,
      campaignName: `${t.theme} ${MONTH_ABBR[m]}${String(y).slice(2)}`,
      theme: t.theme, source, products: t.products, month: m, year: y, monthLabel: label,
      startDate: isoDate(new Date(y, m, int(1, 5))), endDate: isoDate(new Date(y, m + 1, 0)),
      budget: int(60, 900) * 1000,
      channel: source === 'Social media' ? pick(['Meta', 'Instagram', 'YouTube'])
        : source === 'PQ Campaign' ? pick(['SMS Blast', 'WhatsApp', 'Outbound Calling'])
        : source === 'Landing page' ? pick(['Google SEM', 'Display Network']) : pick(['Organic Search', 'Direct']),
      active: y === CONFIG.today.getFullYear() && m === CONFIG.today.getMonth(),
      uploadedBy: 'Product Team',
    })
  }
}

// -------------------------------------------------------------- 3. the leads
const PORTFOLIO_WEIGHTS = [
  ['Retail Personal Loans', 34], ['Retail Home Loans', 20], ['Business & MSME Loans', 16],
  ['Loan Against Property', 10], ['Vehicle & Consumer Loans', 11],
  ['Gold & Secured Loans', 6], ['Professional Loans', 3],
]
const SOURCE_WEIGHTS = [['Website', 30], ['Landing page', 27], ['Social media', 25], ['PQ Campaign', 18]]

const OUT_OF_SEASON = 0.2
const PRODUCT_BASE = Object.fromEntries(PRODUCTS.map((p) => {
  const w = PORTFOLIO_WEIGHTS.find(([n]) => n === p.portfolio)[1]
  return [p.name, w / PRODUCTS.filter((x) => x.portfolio === p.portfolio).length]
}))
const SEASON_PEAK = Object.fromEntries(PRODUCTS.map((p) => {
  const k = p.season.length
  return [p.name, k ? (12 - (12 - k) * OUT_OF_SEASON) / k : 1]
}))
const productForMonth = (month) => weighted(PRODUCTS.map((p) => {
  const s = !p.season.length ? 1 : p.season.includes(month) ? SEASON_PEAK[p.name] : OUT_OF_SEASON
  return [p, PRODUCT_BASE[p.name] * s]
}))

/** Status mix shifts with lead age — fresh leads open, old leads resolved. */
function statusForAge(days) {
  if (days <= 2)  return weighted([['New', 62], ['Not reachable', 14], ['Follow-up', 18], ['Not interested', 4], ['Duplicate', 2]])
  if (days <= 7)  return weighted([['New', 12], ['Not reachable', 20], ['Follow-up', 34], ['Login Initiated', 14], ['Not interested', 14], ['Rejected', 4], ['Duplicate', 2]])
  if (days <= 21) return weighted([['Not reachable', 14], ['Follow-up', 22], ['Login Initiated', 16], ['Sanctioned', 8], ['Disbursed', 3], ['Not interested', 22], ['Rejected', 13], ['Duplicate', 2]])
  if (days <= 60) return weighted([['Not reachable', 10], ['Follow-up', 10], ['Login Initiated', 8], ['Sanctioned', 8], ['Disbursed', 16], ['Not interested', 26], ['Rejected', 20], ['Duplicate', 2]])
  return weighted([['Not reachable', 8], ['Follow-up', 3], ['Login Initiated', 3], ['Sanctioned', 4], ['Disbursed', 17], ['Not interested', 29], ['Rejected', 32], ['Duplicate', 2]])
}

function offerAmountFor(product) {
  const [lo, hi] = product.ticket
  const raw = lo + rnd() * rnd() * (hi - lo)
  const step = raw > 5000000 ? 500000 : raw > 1000000 ? 100000 : raw > 200000 ? 25000 : 5000
  return Math.max(lo, Math.round(raw / step) * step)
}

const branchWeight = {}
for (const b of BRANCHES) branchWeight[b.code] = (METRO.has(b.city) ? 2.4 : 1) * (0.6 + rnd() * 0.9)
const dstSkill = {}
for (const u of users) if (u.role === 'DST') dstSkill[u.id] = 0.55 + rnd() * 0.9

const STAFF_NAMES = new Set(users.map((u) => u.name))
/** A customer name that is guaranteed not to collide with any staff name. */
function customerName(state) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const n = personName(state)
    if (!STAFF_NAMES.has(n)) return n
  }
  return `${personName(state)} ${pick(['Jr', 'Sr'])}`
}

const usedMobiles = new Set()
/**
 * Identities already in the book. Roughly one lead in eight is a REPEAT enquiry
 * from someone already on file — a different product, later campaign, same
 * person. Without this every customer has exactly one lead, Customer 360 has
 * nothing to show, and cross-sell cannot be demonstrated.
 */
const identities = []
const mobile = () => {
  let m
  do { m = `${pick([6, 7, 8, 9])}${String(int(100000000, 999999999)).slice(0, 9)}` } while (usedMobiles.has(m))
  usedMobiles.add(m)
  return m
}

const leads = []
let lanSeq = 0
// Live inputs for the assignment engine: rotation cursors persist across leads
// so round robin actually rotates, and open-lead counts grow as we go, so the
// balanced strategy genuinely balances.
const rotationCursor = {}
const openCounts = {}
const OPEN = ['New', 'Not reachable', 'Follow-up', 'Login Initiated', 'Sanctioned']

for (let i = 1; i <= CONFIG.leadCount; i++) {
  const monthIdx = weighted(monthKeys.map((mk, idx) => [idx, idx === monthKeys.length - 1 ? 4 : 8 + idx * 0.5]))
  const mk = monthKeys[monthIdx]
  const daysInMonth = new Date(mk.y, mk.m + 1, 0).getDate()
  const maxDay = mk.m === CONFIG.today.getMonth() && mk.y === CONFIG.today.getFullYear() ? CONFIG.today.getDate() : daysInMonth
  const createdAt = new Date(mk.y, mk.m, int(1, maxDay), int(9, 20), pick([0, 5, 12, 18, 23, 31, 37, 44, 51, 58]))
  if (createdAt > CONFIG.today) { i--; continue }
  const ageDays = Math.floor((CONFIG.today - createdAt) / 86400000)

  const unmapped = chance(0.012)
  const branch = unmapped ? null : (() => {
    const code = weighted(BRANCHES.map((b) => [b.code, branchWeight[b.code]]))
    return BRANCHES.find((b) => b.code === code)
  })()
  const pincode = unmapped ? pick(UNMAPPED_PINCODES).pincode : pick(branch.pincodes)
  const geo = resolvePincode(pincode)

  const product = productForMonth(mk.m)
  const offerAmount = offerAmountFor(product)
  const eligibleOcc = OCCUPATIONS.filter((o) => product.employment.includes(OCCUPATION_EMPLOYMENT[o]))
  const occupation = weighted(eligibleOcc.map((o) => [o, o.startsWith('Salaried') ? 8 : o === 'Business Owner' ? 6 : o.startsWith('Self-Employed') ? 5 : 1]))
  const employment = OCCUPATION_EMPLOYMENT[occupation]

  // Prefer a repeat enquiry from an existing customer in the same city.
  const repeatPool = identities.filter((x) => x.city === geo.city && x.product !== product.name)
  const repeat = repeatPool.length && chance(0.13) ? pick(repeatPool) : null

  const fullName = repeat ? repeat.fullName : customerName(geo.state)
  const [firstName, ...rest] = fullName.split(' ')
  const lastName = rest.join(' ')

  const source = weighted(SOURCE_WEIGHTS)
  const monthCampaigns = campaigns.filter((c) => c.month === mk.m && c.year === mk.y && c.products.includes(product.name))
  const anyThisMonth = campaigns.filter((c) => c.month === mk.m && c.year === mk.y)
  const campaign = monthCampaigns.length ? pick(monthCampaigns) : (anyThisMonth.length ? pick(anyThisMonth) : campaigns[0])

  // --- ROUTE THE LEAD THROUGH THE REAL ENGINE -----------------------------
  const decision = assignLead(
    { pincode, product: product.name },
    users,
    { openLeadCountByUser: openCounts, rotationCursor, strategy: DEFAULT_STRATEGY },
  )
  const assignedTo = decision.assignedTo
  const owner = assignedTo ? users.find((u) => u.id === assignedTo) : null
  const sm = owner ? users.find((u) => u.id === owner.managerId) : null
  const ah = sm ? users.find((u) => u.id === sm.managerId) : null
  const rh = ah ? users.find((u) => u.id === ah.managerId) : null
  const zh = rh ? users.find((u) => u.id === rh.managerId) : null

  let status = assignedTo ? statusForAge(ageDays) : 'New'
  if (owner && owner.role === 'DST') {
    const skill = dstSkill[owner.id] ?? 1
    if (skill > 1.15 && status === 'Login Initiated' && chance(0.22)) status = 'Sanctioned'
    if (skill > 1.15 && status === 'Sanctioned' && ageDays > 25 && chance(0.3)) status = 'Disbursed'
    if (skill < 0.8 && status === 'Disbursed' && chance(0.35)) status = 'Sanctioned'
    if (skill < 0.8 && status === 'Login Initiated' && chance(0.25)) status = 'Not interested'
  }
  if (OPEN.includes(status) && assignedTo) openCounts[assignedTo] = (openCounts[assignedTo] || 0) + 1

  const isDuplicate = status === 'Duplicate'
  const reachedLogin = ['Login Initiated', 'Sanctioned', 'Disbursed'].includes(status)
  const contacted = ['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed'].includes(status)
  const reasonPool = REASONS.filter((r) => r.appliesTo.includes(status))
  const reason = reasonPool.length ? pick(reasonPool) : null

  // First response, skewed fast and improving month over month.
  const slaDrag = 1.7 - (monthIdx / Math.max(1, monthKeys.length - 1)) * 1.15
  // Most first contacts happen within hours. A minority genuinely drag on for
  // days — a customer who will not pick up. Without that tail nothing ever
  // breaches the 3-day rule and SLA compliance reads a useless 100%.
  const dragTail = 0.16 * slaDrag / Math.sqrt(dstSkill[owner?.id] || 1)
  const firstResponseHours = (contacted || status === 'Not reachable') && owner
    ? chance(Math.min(0.3, dragTail))
      ? +(AGEING_DAYS * 24 + Math.pow(rnd(), 1.6) * 200).toFixed(1)
      : +(0.15 + Math.pow(rnd(), 6) * 11 * slaDrag / Math.sqrt(dstSkill[owner.id] || 1)).toFixed(1)
    : null

  const nextFollowUpDate = status === 'Follow-up' ? isoDate(addDays(CONFIG.today, int(-4, 12))) : null
  // A returning customer keeps their UCIC — that is what ties their leads together.
  const ucic = repeat
    ? repeat.ucic || String(int(100000000, 999999999))
    : source === 'PQ Campaign' || chance(0.28)
      ? String(int(100000000, 999999999))
      : null
  const lanNo = ['Sanctioned', 'Disbursed'].includes(status)
    ? `AFLRET${String(mk.y).slice(2)}${String(++lanSeq).padStart(6, '0')}` : null
  const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('')
  const panNumber = reachedLogin || chance(0.35)
    ? `${pick(L)}${pick(L)}${pick(L)}P${pick(L)}${int(1000, 9999)}${pick(L)}` : null
  const age = occupation === 'Student' ? int(21, 26)
    : occupation === 'Retired / Pensioner' ? int(58, 70)
    : occupation === 'Business Owner' ? int(30, 58) : int(23, 55)
  const emailUser = `${firstName}.${lastName}`.toLowerCase().replace(/[^a-z.]/g, '')
  const emailId = chance(0.92)
    ? `${emailUser}${chance(0.35) ? int(1, 99) : ''}@${pick(['gmail.com', 'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'rediffmail.com'])}`
    : null

  // --- timeline, monotonic and inside business hours for human actions
  let cursor = new Date(createdAt)
  const step = (hours, business = true) => {
    let next = addHours(cursor, Math.max(0.05, hours))
    if (business) {
      const h = next.getHours()
      if (h < 9) next.setHours(9 + int(0, 2), int(0, 59), 0, 0)
      else if (h >= 19) { next = addDays(next, 1); next.setHours(9 + int(0, 2), int(0, 59), 0, 0) }
    }
    if (next <= cursor) next = addHours(cursor, 1)
    if (next > CONFIG.today) next = new Date(CONFIG.today)
    cursor = next
    return iso(cursor)
  }
  const timeline = [{ ts: iso(createdAt), actor: 'System', action: 'Lead Created', detail: `${source} · ${campaign.campaignName}` }]
  if (!assignedTo) {
    timeline.push({
      ts: step(0.2, false), actor: 'System', action: `Rule ${decision.ruleNo} — ${decision.ruleName}`,
      detail: decision.reason || 'Awaiting manual allocation',
    })
  } else {
    timeline.push({
      ts: step(0.25, false), actor: 'System', action: `Rule ${decision.ruleNo} — ${decision.ruleName}`,
      detail: `${owner.name} · ${decision.strategy}`,
    })
    if (firstResponseHours != null) {
      timeline.push({
        ts: step(firstResponseHours - 0.25), actor: owner.name,
        action: contacted ? 'Customer Contacted' : 'Contact Attempted',
        detail: contacted ? `Spoke with customer · ${product.name}` : 'No answer',
      })
    }
    if (status === 'Not reachable')  timeline.push({ ts: step(int(24, 72)),  actor: owner.name,   action: 'Status → Not reachable',   detail: reason?.label })
    if (status === 'Not interested') timeline.push({ ts: step(int(6, 120)),  actor: owner.name,   action: 'Status → Not interested',  detail: reason?.label })
    if (status === 'Follow-up')      timeline.push({ ts: step(int(4, 72)),   actor: owner.name,   action: 'Status → Follow-up',       detail: `Next follow-up ${nextFollowUpDate}` })
    if (reachedLogin)                timeline.push({ ts: step(int(24, 168)), actor: owner.name,   action: 'Status → Login Initiated', detail: 'Application punched into LOS' })
    if (['Sanctioned', 'Disbursed'].includes(status))
                                     timeline.push({ ts: step(int(48, 360)), actor: 'Credit Team', action: 'Status → Sanctioned',     detail: `LAN ${lanNo}` })
    if (status === 'Disbursed')       timeline.push({ ts: step(int(72, 480)), actor: 'Operations',  action: 'Status → Disbursed',      detail: `₹${offerAmount.toLocaleString('en-IN')} credited` })
    if (status === 'Rejected')        timeline.push({ ts: step(int(24, 300)), actor: 'Credit Team', action: 'Status → Rejected',       detail: `${reason?.code} — ${reason?.label}` })
    if (isDuplicate)                  timeline.push({ ts: step(1, false),     actor: 'System',      action: 'Flagged Duplicate',       detail: 'Same campaign, product, LAN and expiry' })
  }
  // An open lead that was created months ago has still been worked recently —
  // otherwise every open lead reads as aged and the 3-day metric says nothing.
  if (OPEN.includes(status) && assignedTo && ageDays > 20 && chance(0.82)) {
    // Skewed toward the last few days, so the 3-day threshold separates a
    // healthy majority from a genuine problem tail rather than flagging everything.
    const touchAt = addDays(CONFIG.today, -Math.floor(Math.pow(rnd(), 2.2) * 15))
    if (touchAt > cursor) {
      cursor = touchAt
      cursor.setHours(9 + int(0, 8), int(0, 59), 0, 0)
      if (cursor > CONFIG.today) cursor = new Date(CONFIG.today)
      timeline.push({
        ts: iso(cursor), actor: owner.name, action: 'Follow-up attempt logged',
        detail: `Still in ${status} — customer being pursued`,
      })
    }
  }
  const lastActivity = cursor
  const daysInCurrentStatus = Math.floor((CONFIG.today - lastActivity) / 86400000)

  leads.push({
    leadId: formatLeadId(i),
    firstName, lastName,
    leadSource: source,
    campaignName: campaign.campaignName,
    campaignId: campaign.campaignId,
    leadCreatedDate: iso(createdAt),
    ucic,
    mobileNumber: repeat ? repeat.mobileNumber : mobile(),
    alternateMobile: repeat ? repeat.alternateMobile : chance(0.3) ? mobile() : null,
    emailId: repeat ? repeat.emailId : emailId,
    dateOfBirth: repeat ? repeat.dateOfBirth : isoDate(new Date(CONFIG.today.getFullYear() - age, int(0, 11), int(1, 28))),
    panNumber,
    panAttachment: panNumber ? { fileName: `PAN_${firstName}_${lastName}.pdf`, uploadedOn: isoDate(addDays(createdAt, int(1, 6))) } : null,
    city: geo.city, district: geo.district, state: geo.state, pincode, country: 'India',
    portfolio: product.portfolio, product: product.name, productCode: product.code,
    offerAmount,
    offerValidTill: isoDate(addDays(createdAt, pick([30, 45, 60]))),
    assignedTo,
    assignedToName: owner ? owner.name : null,
    region: geo.region, zone: geo.zone, area: owner?.area ?? null,
    branch: geo.branch, branchCode: geo.branchCode,
    leadStatus: status,
    reasonCode: reason ? reason.code : null,
    reason: reason ? reason.label : null,
    nextFollowUpDate,
    lanNo,
    statusUpdatedOn: iso(lastActivity),
    duplicateFlag: isDuplicate ? 'Yes' : 'No',
    lastModifiedBy: owner ? owner.name : 'System',
    lastModifiedOn: iso(lastActivity),
    occupation,
    // --- assignment provenance, so the app can show WHY a lead sits where it does
    assignmentRuleNo: decision.ruleNo,
    assignmentRuleName: decision.ruleName,
    assignmentOutcome: decision.outcome,
    assignmentStrategy: decision.strategy,
    assignmentPoolSize: decision.poolSize,
    parkedWith: decision.parkedWith,
    parkedReason: decision.reason,
    isUnallocated: !assignedTo,
    // --- reporting chain, for hierarchy scoping
    smId: sm?.id ?? null, ahId: ah?.id ?? null, rhId: rh?.id ?? null, zhId: zh?.id ?? null,
    employmentType: employment,
    firstResponseHours,
    // AFL's only stated threshold is 3 days, so SLA is measured against that
    // rather than the mockup's invented 2-hour target.
    slaBreached: firstResponseHours != null ? firstResponseHours > AGEING_DAYS * 24 : ageDays >= AGEING_DAYS && status === 'New',
    daysInCurrentStatus,
    contacted,
    monthLabel: mk.label,
    consentFlag: true,
    isRepeatCustomer: Boolean(repeat),
    timeline,
  })

  const justAdded = leads[leads.length - 1]
  if (!repeat) {
    identities.push({
      fullName,
      mobileNumber: justAdded.mobileNumber,
      alternateMobile: justAdded.alternateMobile,
      emailId: justAdded.emailId,
      dateOfBirth: justAdded.dateOfBirth,
      ucic: justAdded.ucic,
      city: geo.city,
      product: product.name,
    })
  }
}

// ----------------------------------------------------------------- 4. output
mkdirSync(CONFIG.outDir, { recursive: true })
const banner = (t) => `// AUTO-GENERATED by scripts/generate-dataset.mjs — do not edit by hand.\n// ${t}\n// Seed ${CONFIG.seed} · demo date ${isoDate(CONFIG.today)}\n\n`
writeFileSync(`${CONFIG.outDir}/org.js`, banner(`Sales hierarchy — ${users.length} users across 11 roles.`) + `export const USERS = ${JSON.stringify(users, null, 2)}\n`)
writeFileSync(`${CONFIG.outDir}/campaigns.js`, banner(`Campaign master — ${campaigns.length} campaigns.`) + `export const CAMPAIGNS = ${JSON.stringify(campaigns, null, 2)}\n`)
writeFileSync(`${CONFIG.outDir}/leads.js`, banner(`${leads.length} leads, routed through the real assignment engine.`) + 'export const LEADS = [\n' + leads.map((l) => '  ' + JSON.stringify(l)).join(',\n') + '\n]\n')

// -------------------------------------------------------------- 5. reporting
const tally = (arr, fn) => arr.reduce((m, x) => { const k = fn(x); m[k] = (m[k] || 0) + 1; return m }, {})
const bar = (v, max, w = 40) => '█'.repeat(Math.max(0, Math.round((v / (max || 1)) * w)))
const show = (label, obj) => {
  const rows = Object.entries(obj).sort((a, b) => b[1] - a[1])
  const max = rows[0]?.[1] || 1
  console.log(`\n${label}`)
  for (const [k, v] of rows) console.log(`   ${String(k).padEnd(30)} ${String(v).padStart(5)}  ${bar(v, max)}`)
}
console.log('='.repeat(76))
console.log(`GENERATED  ${leads.length} leads · ${users.length} users · ${campaigns.length} campaigns`)
console.log('='.repeat(76))
show('USERS BY ROLE (11-role hierarchy)', tally(users, (u) => u.role))
console.log(`   ${'inactive (assignment rule 5)'.padEnd(30)} ${String(users.filter((u) => u.status === 'Inactive').length).padStart(5)}`)
show('LEAD STATUS', tally(leads, (l) => l.leadStatus))
show('ASSIGNMENT RULE THAT PLACED THE LEAD', tally(leads, (l) => `Rule ${l.assignmentRuleNo} — ${l.assignmentRuleName}`))
show('ASSIGNMENT OUTCOME', tally(leads, (l) => l.assignmentOutcome))
console.log('\nAGEING (AFL rule: 3 days, uniform across statuses)')
const openLeads = leads.filter((l) => OPEN.includes(l.leadStatus))
console.log(`   open leads                     ${String(openLeads.length).padStart(5)}`)
console.log(`   aged beyond ${AGEING_DAYS} days in status  ${String(openLeads.filter((l) => l.daysInCurrentStatus >= AGEING_DAYS).length).padStart(5)}`)
console.log(`   untouched (New > ${AGEING_DAYS} days)       ${String(leads.filter((l) => l.leadStatus === 'New' && Math.floor((CONFIG.today - new Date(l.leadCreatedDate)) / 86400000) >= AGEING_DAYS).length).padStart(5)}`)
console.log(`   overdue follow-ups             ${String(leads.filter((l) => l.leadStatus === 'Follow-up' && l.nextFollowUpDate < isoDate(CONFIG.today)).length).padStart(5)}`)
console.log(`   follow-ups due today          ${String(leads.filter((l) => l.nextFollowUpDate === isoDate(CONFIG.today)).length).padStart(6)}`)
console.log(`   parked / unallocated           ${String(leads.filter((l) => l.isUnallocated).length).padStart(5)}`)

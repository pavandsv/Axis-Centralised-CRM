// Proves per-user product entitlement narrows what a user sees, on top of
// hierarchy scope (MOM 8 Sep design point: per-user HO entitlement).
import { USERS } from '../src/data/generated/org.js'
import { LEADS } from '../src/data/generated/leads.js'
import { visibleLeads } from '../src/logic/visibility.js'
import { setEntitlement, clearEntitlement } from '../src/logic/entitlementStore.js'

const ho = USERS.find((u) => u.role === 'HO')
const before = visibleLeads(ho, LEADS)
const products = [...new Set(before.map((l) => l.product))].sort()
const pick = products.slice(0, 2)

setEntitlement(ho.id, pick)
const after = visibleLeads(ho, LEADS)
const expected = before.filter((l) => pick.includes(l.product)).length
const leaked = after.filter((l) => !pick.includes(l.product))

console.log(`HO ${ho.name} (${ho.id})`)
console.log(`  unrestricted        : ${before.length} leads across ${products.length} products`)
console.log(`  entitled to         : ${pick.join(', ')}`)
console.log(`  after entitlement   : ${after.length} leads (expected ${expected})`)
console.log(`  out-of-entitlement  : ${leaked.length}`)

clearEntitlement(ho.id)
const restored = visibleLeads(ho, LEADS)
console.log(`  after clearing      : ${restored.length} leads`)

const ok = after.length === expected && leaked.length === 0 && restored.length === before.length && after.length < before.length
console.log(ok ? '\nPASS — entitlement narrows the book and clears cleanly.' : '\nFAIL')
process.exit(ok ? 0 : 1)

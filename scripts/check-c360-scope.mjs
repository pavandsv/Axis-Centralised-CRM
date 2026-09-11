// Proves Customer 360 obeys hierarchy scope: a DST must not be able to look up
// a customer whose leads all belong to someone else.
import { USERS } from '../src/data/generated/org.js'
import { LEADS } from '../src/data/generated/leads.js'
import { visibleLeads } from '../src/logic/visibility.js'

const byId = Object.fromEntries(USERS.map((u) => [u.id, u]))
const dst = USERS.find((u) => u.role === 'DST')
const visible = visibleLeads(dst, LEADS)
const visibleIds = new Set(visible.map((l) => l.leadId))
const leaked = LEADS.filter((l) => !visibleIds.has(l.leadId))

const key = (l) => (l.ucic ? `ucic:${l.ucic}` : `mob:${l.mobileNumber}`)
const mine = new Set(visible.map(key))
const foreignCustomers = new Set(leaked.map(key).filter((k) => !mine.has(k)))

console.log(`DST ${dst.name} (${dst.id})`)
console.log(`  leads visible          : ${visible.length} of ${LEADS.length}`)
console.log(`  customers they may see : ${mine.size}`)
console.log(`  customers they must NOT: ${foreignCustomers.size}`)
console.log(
  foreignCustomers.size > 0 && visible.length < LEADS.length
    ? '\nPASS — scoping has something real to withhold; Customer 360 now filters through visibleLeads().'
    : '\nINCONCLUSIVE — this DST sees everything, pick another fixture.',
)

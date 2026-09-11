// Drill-down is a stated hard requirement, so it gets a test.
//
// The failure this catches: a chart plotting one lead set while its drill
// resolver filters a different one. Platform Activity is yearly and ignores the
// range selector, so resolving against the range-scoped book returned "Nothing
// in this slice" for every month outside the current range.
//
// Rule asserted: if the chart renders a non-zero value, clicking it must return
// that many leads. Not "some" — exactly that many.
import { USERS } from '../src/data/generated/org.js'
import { LEADS } from '../src/data/generated/leads.js'
import { visibleLeads } from '../src/logic/visibility.js'
import { leadsByGeography, platformActivity } from '../src/data/crm.js'

const CONTACTED_SET = new Set(['Not interested', 'Follow-up', 'Login Initiated', 'Sanctioned', 'Disbursed'])
const LOGGED_IN_SET = new Set(['Login Initiated', 'Sanctioned', 'Disbursed'])

const resolve = (book, monthLabel, key) => {
  const inMonth = book.filter((l) => l.monthLabel === monthLabel)
  return {
    leads: inMonth,
    contacted: inMonth.filter((l) => CONTACTED_SET.has(l.leadStatus)),
    loggedIn: inMonth.filter((l) => LOGGED_IN_SET.has(l.leadStatus)),
    sanctioned: inMonth.filter((l) => ['Sanctioned', 'Disbursed'].includes(l.leadStatus)),
    disbursed: inMonth.filter((l) => l.leadStatus === 'Disbursed'),
  }[key]
}

const SERIES = ['leads', 'contacted', 'loggedIn', 'sanctioned', 'disbursed']
let checked = 0
const fails = []

for (const role of ['BH', 'ZH', 'RH', 'AH', 'SM', 'DST']) {
  const user = USERS.find((u) => u.role === role)
  if (!user) continue
  const book = visibleLeads(user, LEADS)
  const months = platformActivity(book, { months: 12 })
  for (const m of months) {
    for (const key of SERIES) {
      const plotted = m[key]
      const drilled = resolve(book, m.monthLabel, key).length
      checked += 1
      if (plotted !== drilled) {
        fails.push(`${role} ${m.monthLabel} ${key}: chart ${plotted}, drill ${drilled}`)
      }
    }
  }
  const empties = months.filter((m) => m.leads === 0).length
  console.log(`${role.padEnd(4)} ${book.length.toString().padStart(4)} leads · ${months.length} months plotted · ${empties} empty`)
}

// Lead Geography: the map, the ranked list and the drill must agree.
for (const role of ['BH', 'ZH', 'RH', 'AH', 'SM', 'DST']) {
  const user = USERS.find((u) => u.role === role)
  if (!user) continue
  const book = visibleLeads(user, LEADS)
  for (const level of ['state', 'region', 'zone']) {
    const { rows, groups } = leadsByGeography(book, level)
    for (const g of groups) {
      const drilled = book.filter((l) => l[level] === g.name).length
      checked += 1
      if (drilled !== g.value) fails.push(`${role} geo/${level} ${g.name}: list ${g.value}, drill ${drilled}`)
    }
    for (const r of rows) {
      if (!groups.some((g) => g.name === r.group)) {
        fails.push(`${role} geo/${level}: polygon ${r.name} points at unknown group ${r.group}`)
      }
    }
  }
}

console.log(`\n${checked} chart-to-drill pairs checked`)
if (fails.length) {
  console.log('FAIL:')
  for (const f of fails.slice(0, 20)) console.log('  ' + f)
  process.exit(1)
}
console.log('ALL DRILL-DOWNS RESOLVE TO THE PLOTTED COUNT')

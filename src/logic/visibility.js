// ---------------------------------------------------------------------------
// Data visibility — Input Sheet tab "Hierarchy", the "Can see data of" column.
//
//   DST  own leads only
//   SM   own team
//   AH   own area and everyone below
//   RH   own region and everyone below
//   ZH   own zone and everyone below
//   NH   entire organisation
//   BH   entire organisation
//   HO / Product Team / Super User   pan organisation
//   IT   no customer data — audit and config only
//
// Every screen scopes through visibleLeads(); nothing queries the lead book directly.
// ---------------------------------------------------------------------------
import { ROLES, SCOPE, can } from '../config/roles.js'
import { entitlementFor } from './entitlementStore.js'

/** Leads this user is allowed to see, per their role's scope. */
export function visibleLeads(user, leads) {
  if (!user) return []
  const scope = ROLES[user.role]?.scope
  if (!scope || scope === SCOPE.NONE) return []

  /**
   * Product entitlement narrows the result AFTER hierarchy scoping — the MOM's
   * per-user HO entitlement. Unconfigured users are entitled to everything, so
   * this is a no-op until an administrator restricts someone.
   */
  const entitled = entitlementFor(user.id)
  const byScope = (rows) => (entitled ? rows.filter((l) => entitled.includes(l.product)) : rows)

  /**
   * "View own leads" is Yes for EVERY sales role in the permission matrix, so a
   * lead assigned directly to a manager must always be visible to them — not
   * only leads owned by someone beneath them. This is the designed flow for a
   * Zonal Head, who "also handles out-of-geography leads" and may take one onto
   * their own plate; without this they could own a lead they cannot see.
   */
  const isOwnOrHeld = (l) => l.assignedTo === user.id || l.parkedWith === user.id

  switch (scope) {
    case SCOPE.OWN:
      return byScope(leads.filter(isOwnOrHeld))
    case SCOPE.TEAM:
      return byScope(leads.filter((l) => l.smId === user.id || isOwnOrHeld(l)))
    case SCOPE.AREA:
      return byScope(leads.filter((l) => l.ahId === user.id || isOwnOrHeld(l)))
    case SCOPE.REGION:
      return byScope(leads.filter((l) => l.rhId === user.id || isOwnOrHeld(l)))
    case SCOPE.ZONE:
      return byScope(leads.filter((l) => l.zhId === user.id || isOwnOrHeld(l)))
    case SCOPE.ORG:
      return byScope(leads)
    default:
      return []
  }
}

/**
 * Users this person can see. Deliberately NOT the same rule as visibleLeads:
 *
 * - ORG-scope and UAM roles see the whole user master. The sales line is a
 *   tree, but the central roles (HO, Product Team, Super User, IT) sit outside
 *   it with nobody reporting to them — counting their subordinates returned 0,
 *   which made the Users widget read zero for exactly the people who can see
 *   everything.
 * - Everyone else sees themselves plus their own reporting line.
 */
export function visibleUsers(user, users) {
  if (!user) return []
  const scope = ROLES[user.role]?.scope
  if (scope === SCOPE.ORG || can(user.role, 'uam')) return users
  return [user, ...subordinates(user, users)]
}

/** Users beneath this one in the reporting line. */
export function subordinates(user, users) {
  if (!user) return []
  const byManager = new Map()
  for (const u of users) {
    if (!u.managerId) continue
    if (!byManager.has(u.managerId)) byManager.set(u.managerId, [])
    byManager.get(u.managerId).push(u)
  }
  const out = []
  const walk = (id) => {
    for (const child of byManager.get(id) || []) {
      out.push(child)
      walk(child.id)
    }
  }
  walk(user.id)
  return out
}

/** The team a manager is accountable for reporting on (their DSTs). */
export const directReports = (user, users) => users.filter((u) => u.managerId === user.id)

/**
 * What a role may export. The DPDP restriction removes phone and address from
 * downloads for DST up to RH even though those roles can see them on screen.
 */
export function exportableFields(role, allFields) {
  if (!can(role, 'downloadReports')) return []
  const blocked = ['DST', 'SM', 'AH', 'RH'].includes(role)
  if (!blocked) return allFields
  const strip = new Set(['mobileNumber', 'alternateMobile', 'address', 'pincode'])
  return allFields.filter((f) => !strip.has(f))
}

/** Human-readable scope, for the UI to state plainly whose data is on screen. */
export function scopeDescription(user) {
  if (!user) return ''
  const r = ROLES[user.role]
  if (!r) return ''
  switch (r.scope) {
    case SCOPE.OWN: return 'Your own leads only'
    case SCOPE.TEAM: return `Your team — ${user.branch || 'branch'}`
    case SCOPE.AREA: return `${user.area || 'Your area'} and everyone below`
    case SCOPE.REGION: return `${user.region || 'Your region'} and everyone below`
    case SCOPE.ZONE: return `${user.zone || 'Your zone'} and everyone below`
    case SCOPE.ORG: return 'Entire organisation'
    case SCOPE.NONE: return 'No customer data — audit and configuration only'
    default: return ''
  }
}

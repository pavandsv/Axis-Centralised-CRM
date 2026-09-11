// ---------------------------------------------------------------------------
// Per-user product entitlement.
//
// MOM 8 Sep, design point: "there will be 8 to 9 HO users on differing product
// entitlements. A single HO role will not suffice, so we will design custom
// roles at HO level with product entitlement configured per user."
//
// Entitlement narrows what a user sees AFTER hierarchy scoping — the two are
// independent filters. A ZH entitled to Home Loans only sees Home Loan leads
// in their zone, not Home Loan leads across the country.
//
// Default is every product, so configuring nobody changes nothing. The role
// tier caps how many products may be selected, per the MOM's three tiers.
// ---------------------------------------------------------------------------
import { PRODUCT_ENTITLEMENT, defaultEntitlement } from '../config/roles.js'
import { PRODUCT_NAMES } from '../data/masters.js'
import { loadSlice, saveSlice } from './persist.js'

const SLICE = 'entitlements'

/** userId -> array of product names. Absent means "all products". */
const overrides = new Map()
const listeners = new Set()
let version = 0

const hydrate = () => {
  const snap = loadSlice(SLICE)
  if (!Array.isArray(snap)) return
  for (const [id, products] of snap) if (Array.isArray(products)) overrides.set(id, products)
}
hydrate()

const bump = () => {
  version += 1
  saveSlice(SLICE, [...overrides])
  listeners.forEach((fn) => fn())
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const entitlementVersion = () => version

/** How many products this role may be entitled to, per the MOM's three tiers. */
export function entitlementCap(role) {
  const tier = defaultEntitlement(role)
  if (tier === PRODUCT_ENTITLEMENT.SINGLE) return 1
  if (tier === PRODUCT_ENTITLEMENT.MULTI) return PRODUCT_NAMES.length
  return PRODUCT_NAMES.length
}

export const entitlementTier = (role) => defaultEntitlement(role)

/** The configured list, or null when the user is entitled to everything. */
export const entitlementFor = (userId) => overrides.get(userId) || null

export function isEntitled(user, product) {
  const list = user ? overrides.get(user.id) : null
  return !list || list.includes(product)
}

export function setEntitlement(userId, products) {
  // An empty or full selection means "no restriction" — storing it as a list
  // would make every future product invisible to that user by default.
  if (!products || !products.length || products.length === PRODUCT_NAMES.length) {
    overrides.delete(userId)
  } else {
    overrides.set(userId, [...products])
  }
  bump()
}

export function clearEntitlement(userId) {
  overrides.delete(userId)
  bump()
}

export const entitlementSummary = (userId) => {
  const list = overrides.get(userId)
  if (!list) return 'All products'
  return list.length === 1 ? list[0] : `${list.length} products`
}

export const restrictedCount = () => overrides.size

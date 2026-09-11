// ---------------------------------------------------------------------------
// Session user store.
//
// MOM 8 Sep, Access Control: "User creation is restricted to Super Admin, with
// the platform sized for 1,200+ users." The POC had no way to create one — the
// admin screen could only activate and deactivate.
//
// USERS is a single array shared by thirteen modules (the assignment engine,
// the trigger engine, the role switcher, the login list). Rather than thread a
// dynamic list through all of them, a created user is pushed into that same
// array and into usersById, so every consumer sees it the moment it exists —
// including round-robin allocation. Mutating a shared import is deliberate and
// only safe because this is a single-session, no-backend POC; with a backend
// the list would be fetched.
//
// Status changes live here too. They used to be React state inside the admin
// page, so deactivating someone was invisible to the rest of the app and was
// lost on reload.
// ---------------------------------------------------------------------------
import { USERS } from '../data/generated/org.js'
import { BRANCHES } from '../data/geography.js'
import { ROLES } from '../config/roles.js'
import { loadSlice, saveSlice } from './persist.js'

const SLICE = 'users'

const created = []
const overrides = new Map()
const listeners = new Set()
let version = 0

const byId = new Map(USERS.map((u) => [u.id, u]))

const persist = () => saveSlice(SLICE, { created, overrides: [...overrides] })

const bump = () => {
  version += 1
  persist()
  listeners.forEach((fn) => fn())
}

export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
export const userVersion = () => version

/** Put a user in front of every consumer of the shared array. */
const install = (user) => {
  if (byId.has(user.id)) return
  byId.set(user.id, user)
  USERS.push(user)
}

const hydrate = () => {
  const snap = loadSlice(SLICE)
  if (!snap) return
  if (Array.isArray(snap.created)) {
    for (const u of snap.created) {
      created.push(u)
      install(u)
    }
  }
  if (Array.isArray(snap.overrides)) for (const [id, patch] of snap.overrides) overrides.set(id, patch)
}
hydrate()

/** The user list with session patches applied. */
export const getUsers = () =>
  USERS.map((u) => (overrides.has(u.id) ? { ...u, ...overrides.get(u.id) } : u))

export const getUser = (id) => {
  const base = byId.get(id)
  if (!base) return null
  return overrides.has(id) ? { ...base, ...overrides.get(id) } : base
}

export const sessionUsers = () => created
export const isSessionUser = (id) => created.some((u) => u.id === id)

const initials = (name) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

const nextId = (role) => {
  const prefix = role.toLowerCase().replace(/_/g, '-')
  let n = USERS.filter((u) => u.role === role).length + 1
  while (byId.has(`${prefix}-${String(n).padStart(3, '0')}`)) n += 1
  return `${prefix}-${String(n).padStart(3, '0')}`
}

export function validateUser({ name, role, email, managerId, branchCode }) {
  const errors = {}
  if (!name || name.trim().length < 3) errors.name = 'Enter the full name'
  if (!role || !ROLES[role]) errors.role = 'Pick a role'
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = 'Enter a valid email'
  else if (USERS.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
    errors.email = 'That email already belongs to another user'
  }
  // The sales line reports upward and sits at a branch; central roles do not.
  const central = ROLES[role]?.central || role === 'BH' || role === 'SUPER'
  if (!central && !managerId) errors.managerId = 'Pick a reporting manager'
  if (['DST', 'SM'].includes(role) && !branchCode) errors.branchCode = 'Pick a branch'
  return errors
}

export function createUser(form) {
  const errors = validateUser(form)
  if (Object.keys(errors).length) return { user: null, errors }

  const branch = BRANCHES.find((b) => b.code === form.branchCode)
  const manager = form.managerId ? byId.get(form.managerId) : null

  const user = {
    id: nextId(form.role),
    role: form.role,
    name: form.name.trim(),
    managerId: form.managerId || null,
    email: form.email.trim().toLowerCase(),
    avatar: initials(form.name),
    password: 'Demo@123',
    phone: form.phone?.trim() || '',
    joiningDate: new Date().toISOString().slice(0, 10),
    status: 'Active',
    zone: branch?.zone || manager?.zone || null,
    region: branch?.region || manager?.region || null,
    area: manager?.area || null,
    branch: branch?.branch || null,
    branchCode: branch?.code || null,
    city: branch?.city || manager?.city || 'Mumbai',
    scopeLabel: ROLES[form.role]?.scope || '',
    products: [],
    createdInSession: true,
  }

  created.push(user)
  install(user)
  bump()
  return { user, errors: {} }
}

export function setUserStatus(id, status) {
  overrides.set(id, { ...(overrides.get(id) || {}), status })
  bump()
  return getUser(id)
}

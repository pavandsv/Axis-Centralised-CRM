// ---------------------------------------------------------------------------
// Session persistence.
//
// There is no backend, so a browser reload would otherwise throw away the
// signed-in user along with every lead, patch and audit entry made on screen.
// Each store keeps its own slice under one namespace; a reload rehydrates them
// before the first render, so refreshing looks like nothing happened.
//
// localStorage rather than sessionStorage: the brief is that a user stays
// signed in until they press Log out, which has to survive closing the tab.
// Every access is guarded — private windows and blocked site data throw on
// touch, and the app must still render with nothing stored.
// ---------------------------------------------------------------------------

const NS = 'afl.crm'

// Bumping this abandons snapshots written by an older build rather than
// rehydrating a shape the code no longer understands.
const SCHEMA = 1

const key = (slice) => `${NS}.v${SCHEMA}.${slice}`

let available
const storage = () => {
  if (available === undefined) {
    try {
      const probe = `${NS}.probe`
      window.localStorage.setItem(probe, '1')
      window.localStorage.removeItem(probe)
      available = true
    } catch {
      available = false
    }
  }
  return available ? window.localStorage : null
}

export function loadSlice(slice) {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(key(slice))
    return raw ? JSON.parse(raw) : null
  } catch {
    // A truncated or hand-edited value is not worth recovering — start clean.
    try { store.removeItem(key(slice)) } catch { /* nothing further to do */ }
    return null
  }
}

export function saveSlice(slice, value) {
  const store = storage()
  if (!store) return
  try {
    store.setItem(key(slice), JSON.stringify(value))
  } catch {
    // Quota exceeded, most likely. Losing persistence is survivable; throwing
    // mid-mutation is not.
  }
}

export function clearSlice(slice) {
  const store = storage()
  if (!store) return
  try { store.removeItem(key(slice)) } catch { /* nothing further to do */ }
}

/** Drop every slice — used when the demo is reset back to the seeded dataset. */
export function clearAll() {
  const store = storage()
  if (!store) return
  try {
    for (const k of Object.keys(store)) if (k.startsWith(`${NS}.`)) store.removeItem(k)
  } catch { /* nothing further to do */ }
}

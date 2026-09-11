import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { TODAY, USERS, liveLeads, usersById } from '../data/crm'
import { buildNotifications, notificationsForUser } from '../logic/notifications'
import { ROLES } from '../config/roles'
import { auditEvents } from '../logic/auditTrail'
import { clearSlice, loadSlice, saveSlice } from '../logic/persist'

export const AuthContext = createContext(null)

import { storeVersion, subscribe as subscribeLeads } from '../logic/leadStore'

// Notifications are derived by the trigger engine from the CURRENT lead book, so
// creating a lead in session raises its trigger-1 alert immediately.

const SESSION_SLICE = 'session'

/**
 * Who was signed in last time the tab was open. Resolved through usersById so a
 * stored id that no longer exists in the user master signs out cleanly instead
 * of leaving a half-built session.
 */
const restoreUser = () => {
  const snap = loadSlice(SESSION_SLICE)
  return (snap?.userId && usersById[snap.userId]) || null
}

export function AuthProvider({ children }) {
  // Read synchronously on the first render: resolving this in an effect would
  // send ProtectedApp to /login for a frame and lose the current route.
  const [currentUser, setCurrentUser] = useState(restoreUser)
  const [readIds, setReadIds] = useState(() => new Set(loadSlice(SESSION_SLICE)?.readIds || []))
  const [leadVersion, setLeadVersion] = useState(storeVersion())
  useEffect(() => subscribeLeads(() => setLeadVersion(storeVersion())), [])

  const built = useMemo(() => buildNotifications(liveLeads(), USERS, TODAY), [leadVersion])

  const login = useCallback((userId) => {
    const user = usersById[userId]
    if (!user) return false
    setCurrentUser(user)
    setReadIds(new Set())
    auditEvents.login(user)
    return true
  }, [])

  // The only path that ends a session. A reload deliberately does not.
  const logout = useCallback(() => {
    setCurrentUser((prev) => {
      if (prev) auditEvents.logout(prev)
      return null
    })
    setReadIds(new Set())
    clearSlice(SESSION_SLICE)
  }, [])

  /** Switch role without leaving the app — for walking a client through the hierarchy. */
  const switchUser = useCallback((userId) => {
    const user = usersById[userId]
    if (!user) return false
    setCurrentUser((prev) => {
      if (prev) auditEvents.roleSwitch(prev, user)
      return user
    })
    setReadIds(new Set())
    return true
  }, [])

  // One writer for the whole session slice, so login, role switch and marking a
  // notification read all land the same way.
  useEffect(() => {
    if (currentUser) saveSlice(SESSION_SLICE, { userId: currentUser.id, readIds: [...readIds] })
  }, [currentUser, readIds])

  const { notifications, digests } = useMemo(() => {
    if (!currentUser) return { notifications: [], digests: [] }
    const view = notificationsForUser(built, currentUser.id)
    return {
      notifications: view.own
        .map((n) => ({ ...n, read: readIds.has(n.id) }))
        .sort((a, b) => b.ts.localeCompare(a.ts)),
      digests: view.digests.map((d) => ({ ...d, read: readIds.has(d.id) })),
    }
  }, [currentUser, readIds, built])

  const unreadCount =
    notifications.filter((n) => !n.read).length + digests.filter((d) => !d.read).length

  const markRead = useCallback((id) => {
    setReadIds((prev) => new Set(prev).add(id))
  }, [])

  const markAllRead = useCallback(() => {
    setReadIds(new Set([...notifications.map((n) => n.id), ...digests.map((d) => d.id)]))
  }, [notifications, digests])

  const value = {
    currentUser,
    role: currentUser?.role,
    roleMeta: currentUser ? ROLES[currentUser.role] : null,
    notifications,
    digests,
    unreadCount,
    login,
    logout,
    switchUser,
    markRead,
    markAllRead,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

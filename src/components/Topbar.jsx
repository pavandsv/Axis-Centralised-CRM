import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, ArrowLeftRight, Bell, CalendarClock, CheckCheck, ChevronDown,
  CircleUserRound, Info, Lock, LogOut, Mail, MapPin, Search, Users, Zap,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { ROLES, ROLE_CODES, roleBadgeCode } from '../config/roles'
import { USERS, liveLeads } from '../data/crm'
import { visibleLeads, scopeDescription } from '../logic/visibility'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/leads': 'Leads',
  '/analytics': 'Analytics',
  '/tasks': 'Tasks',
  '/audit': 'Audit Logs',
  '/admin': 'User Administration',
  '/customer360': 'Customer 360',
}

/** Icon per trigger, so a notification's kind is legible at a glance. */
const TRIGGER_STYLE = {
  leadAllocated: { icon: Zap, bg: 'bg-[#FDF0F4]', fg: 'text-[#861D3F]' },
  followUpDueToday: { icon: CalendarClock, bg: 'bg-amber-50', fg: 'text-amber-600' },
  followUpOverdue: { icon: AlertTriangle, bg: 'bg-red-50', fg: 'text-red-600' },
  newBeyondAgeing: { icon: AlertTriangle, bg: 'bg-red-50', fg: 'text-red-600' },
  leadReassigned: { icon: ArrowLeftRight, bg: 'bg-slate-100', fg: 'text-slate-600' },
}

function NotificationPanel() {
  const { notifications, digests, markRead, markAllRead } = useAuth()
  const empty = !notifications.length && !digests.length

  return (
    <div className="animate-slide-up absolute right-0 top-full z-50 mt-2 w-[420px] overflow-hidden rounded-2xl border border-af-border bg-white shadow-lg">
      <div className="flex items-center justify-between border-b border-af-border px-4 py-3">
        <span className="text-sm font-semibold text-gray-800">Notifications</span>
        <button onClick={markAllRead} className="flex items-center gap-1 text-xs text-slate-400 transition-colors hover:text-[#861D3F]">
          <CheckCheck size={12} /> Mark all read
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {empty && <div className="px-4 py-8 text-center text-sm text-slate-400">All caught up</div>}

        {notifications.map((n) => {
          const cfg = TRIGGER_STYLE[n.triggerKey] || { icon: Info, bg: 'bg-slate-100', fg: 'text-slate-600' }
          const Icon = cfg.icon
          return (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`flex w-full gap-3 border-b border-af-border/50 px-4 py-3 text-left transition-colors hover:bg-af-bg ${n.read ? '' : 'bg-[#FDF0F4]/30'}`}
            >
              <div className={`mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
                <Icon size={14} className={cfg.fg} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold leading-tight ${n.read ? 'text-slate-500' : 'text-gray-800'}`}>{n.title}</p>
                  {!n.read && <div className="mt-0.5 h-2 w-2 flex-shrink-0 rounded-full bg-[#861D3F]" />}
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-slate-400">{n.message}</p>
                <p className="mt-1 text-[10px] text-slate-300">
                  Trigger {n.triggerNo} · {n.channels.join(' + ')} · {n.timing}
                </p>
              </div>
            </button>
          )
        })}

        {digests.length > 0 && (
          <>
            <p className="border-b border-af-border bg-af-bg px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Team roll-ups — sent to you only
            </p>
            {digests.map((d) => (
              <div key={d.id} className="border-b border-af-border/50 px-4 py-3">
                <p className="text-xs font-semibold leading-tight text-gray-800">{d.subject}</p>
                <div className="mt-2 space-y-1">
                  {d.breakdown.slice(0, 5).map((b) => (
                    <div key={b.userId} className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">{b.userName} <span className="text-slate-300">({b.role})</span></span>
                      <span className="font-semibold text-slate-600">{b.count}</span>
                    </div>
                  ))}
                  {d.breakdown.length > 5 && (
                    <p className="text-[10px] text-slate-400">+{d.breakdown.length - 5} more team members</p>
                  )}
                </div>
                {/* The rule made visible: the team is never copied. */}
                <div className="mt-2 flex items-start gap-1.5 rounded-lg border border-af-border bg-af-bg px-2 py-1.5">
                  <Lock size={10} className="mt-0.5 flex-shrink-0 text-slate-400" />
                  <p className="text-[10px] leading-relaxed text-slate-500">{d.disclaimer}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

/** Switch role in place — the fastest way to show a client the hierarchy working. */
function RoleSwitcher({ onClose }) {
  const { currentUser, switchUser } = useAuth()

  const options = useMemo(
    () =>
      ROLE_CODES.map((code) => {
        const candidates = USERS.filter((u) => u.role === code && u.status !== 'Inactive')
        const user = candidates.find((u) => visibleLeads(u, liveLeads()).length > 0) || candidates[0]
        return user ? { user, meta: ROLES[code], count: visibleLeads(user, liveLeads()).length } : null
      }).filter(Boolean),
    [],
  )

  return (
    <div className="animate-slide-up absolute right-0 top-full z-50 mt-2 w-[360px] overflow-hidden rounded-2xl border border-af-border bg-white shadow-lg">
      <div className="border-b border-af-border px-4 py-3">
        <p className="text-sm font-semibold text-gray-800">View as another role</p>
        <p className="mt-0.5 text-[11px] text-slate-400">
          Demo aid — the whole app re-scopes instantly. Lead counts show what each role can see.
        </p>
      </div>
      <div className="max-h-[380px] overflow-y-auto p-2">
        {options.map(({ user, meta, count }) => {
          const active = user.id === currentUser.id
          return (
            <button
              key={user.id}
              onClick={() => {
                switchUser(user.id)
                onClose()
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-[#FDF0F4]' : 'hover:bg-af-bg'}`}
            >
              <span
                title={meta.name}
                className={`w-14 flex-shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-full px-2 py-0.5 text-center text-[10px] font-bold ${active ? 'bg-[#861D3F] text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                {roleBadgeCode(meta.code)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-gray-800">{user.name}</span>
                <span className="block truncate text-[10px] text-slate-400">{scopeDescription(user)}</span>
              </span>
              <span className="flex-shrink-0 text-xs font-bold text-slate-600" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {count.toLocaleString('en-IN')}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ProfileMenu({ onClose }) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const meta = ROLES[currentUser?.role]
  const rows = [
    { icon: Users, val: meta?.designation },
    { icon: Mail, val: currentUser?.email },
    { icon: MapPin, val: currentUser?.city },
  ]
  return (
    <div className="animate-slide-up absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-af-border bg-white shadow-lg">
      <div className="border-b border-af-border px-5 py-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#861D3F]">
            <CircleUserRound size={22} className="text-white" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-tight text-gray-900">{currentUser?.name}</p>
            <span className="rounded-full bg-[#FDF0F4] px-2 py-0.5 text-[10px] font-bold text-[#861D3F]">{currentUser?.role}</span>
          </div>
        </div>
        <div className="space-y-1.5">
          {rows.map(({ icon: Icon, val }) => val && (
            <div key={val} className="flex items-center gap-2 text-xs text-slate-500">
              <Icon size={12} className="flex-shrink-0 text-slate-300" />
              <span className="truncate">{val}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 rounded-lg border border-af-border bg-af-bg px-2 py-1.5 text-[10px] leading-relaxed text-slate-500">
          {scopeDescription(currentUser)}
        </p>
      </div>
      <div className="p-2">
        <button
          onClick={() => { logout(); navigate('/login'); onClose() }}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          <LogOut size={15} /> Sign Out
        </button>
      </div>
    </div>
  )
}

export default function Topbar() {
  const { currentUser, unreadCount } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(null) // 'notif' | 'role' | 'profile'
  const [search, setSearch] = useState('')
  const wrap = useRef(null)
  const title = PAGE_TITLES[location.pathname] || 'Dashboard'

  useEffect(() => {
    const handler = (e) => { if (wrap.current && !wrap.current.contains(e.target)) setOpen(null) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const submitSearch = () => {
    if (!search.trim()) return
    sessionStorage.setItem('globalSearch', search.trim())
    setSearch('')
    navigate('/leads')
  }

  return (
    <header className="flex h-14 flex-shrink-0 items-center justify-between border-b border-af-border bg-white px-6">
      <div className="min-w-0">
        <h1 className="text-base font-bold text-gray-800">{title}</h1>
        <p className="truncate text-xs text-slate-400">
          {currentUser?.role} · {scopeDescription(currentUser)}
        </p>
      </div>

      <div className="flex items-center gap-2" ref={wrap}>
        <div className="relative hidden sm:block">
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 cursor-pointer text-slate-400 transition-colors hover:text-[#861D3F]"
            onClick={submitSearch}
          />
          <input
            type="text"
            placeholder="Search leads, customers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitSearch()}
            className="w-52 rounded-xl border border-af-border bg-af-bg py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-slate-400 transition-all duration-150 focus:border-[#861D3F]/40 focus:outline-none focus:ring-2 focus:ring-[#861D3F]/20"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(open === 'role' ? null : 'role')}
            title="View as another role"
            className="flex h-9 items-center gap-1.5 rounded-xl border border-af-border bg-white px-2.5 text-slate-500 transition-all hover:border-[#861D3F]/30 hover:text-[#861D3F]"
          >
            <ArrowLeftRight size={14} />
            <span className="hidden text-xs font-semibold md:inline">View as</span>
          </button>
          {open === 'role' && <RoleSwitcher onClose={() => setOpen(null)} />}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(open === 'notif' ? null : 'notif')}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-af-border bg-white text-slate-400 transition-all hover:border-[#861D3F]/30 hover:text-[#861D3F]"
          >
            <Bell size={15} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#861D3F] text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {open === 'notif' && <NotificationPanel />}
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen(open === 'profile' ? null : 'profile')}
            className="ml-1 flex items-center gap-2.5 border-l border-af-border pl-3 transition-opacity hover:opacity-80"
          >
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#861D3F]">
              <CircleUserRound size={18} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-xs font-semibold leading-none text-gray-800">{currentUser?.name?.split(' ')[0]}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">{currentUser?.role}</p>
            </div>
            <ChevronDown size={12} className={`text-slate-400 transition-transform duration-200 ${open === 'profile' ? 'rotate-180' : ''}`} />
          </button>
          {open === 'profile' && <ProfileMenu onClose={() => setOpen(null)} />}
        </div>
      </div>
    </header>
  )
}

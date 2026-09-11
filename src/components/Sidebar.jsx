import { NavLink, useNavigate } from 'react-router-dom'
import {
  BarChart3, CalendarCheck, ChevronLeft, CircleUserRound, ClipboardList,
  LayoutDashboard, LogOut, Settings, Shield, Users,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { can } from '../config/roles'
import { LOGO_ICON, LOGO_ON_DARK, LOGO_WORDMARK } from '../assets/brand'

/**
 * Navigation is derived from the permission matrix, not hardcoded per role — so
 * a menu item can never appear for a role that cannot use the screen behind it.
 */
export function navFor(role) {
  const items = []
  if (can(role, 'viewDashboard')) items.push({ to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' })
  if (can(role, 'viewOwnLeads')) {
    items.push({
      to: '/leads',
      icon: ClipboardList,
      label: can(role, 'viewTeamLeads') ? 'Leads' : 'My Leads',
    })
    items.push({ to: '/tasks', icon: CalendarCheck, label: 'Tasks' })
  }
  if (can(role, 'viewCustomer360')) items.push({ to: '/customer360', icon: Users, label: 'Customer 360' })
  if (can(role, 'viewDashboard')) items.push({ to: '/analytics', icon: BarChart3, label: 'Analytics' })
  // Audit is a dedicated section (first login, last login, all touchpoints).
  // Restricted to the roles holding config/full access — AFL to confirm the list.
  if (['IT', 'SUPER', 'HO', 'PRODUCT_TEAM'].includes(role)) {
    items.push({ to: '/audit', icon: Shield, label: 'Audit Logs' })
  }
  if (can(role, 'uam')) items.push({ to: '/admin', icon: Settings, label: 'User Admin' })
  return items
}

export default function Sidebar({ collapsed, onToggle }) {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const items = navFor(currentUser?.role)

  // The sidebar must never render as an empty maroon bar. If the artwork fails
  // for any reason, swap in a text wordmark.
  const onLogoError = (e) => {
    const img = e.currentTarget
    img.style.display = 'none'
    const fallback = img.parentElement?.querySelector('[data-logo-fallback]')
    if (fallback) fallback.hidden = false
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside
      className={`flex h-full flex-shrink-0 flex-col transition-all duration-300 ${collapsed ? 'w-[60px]' : 'w-[228px]'}`}
      style={{ background: 'linear-gradient(180deg, #6B1532 0%, #861D3F 100%)' }}
    >
      <div className={`flex flex-shrink-0 items-center border-b border-white/10 py-4 ${collapsed ? 'justify-center px-0' : 'gap-3 px-4'}`}>
        {!collapsed ? (
          <img
            src={LOGO_WORDMARK}
            alt="Axis Finance"
            className="h-7 w-auto flex-shrink-0 object-contain"
            style={LOGO_ON_DARK}
            onError={onLogoError}
          />
        ) : (
          <img
            src={LOGO_ICON}
            alt="Axis Finance"
            className="h-8 w-8 flex-shrink-0 object-contain"
            style={LOGO_ON_DARK}
            onError={onLogoError}
          />
        )}
        <span
          data-logo-fallback
          hidden
          className="whitespace-nowrap text-[13px] font-bold tracking-wide text-white"
        >
          {collapsed ? 'AF' : 'AXIS FINANCE'}
        </span>
        <button
          onClick={onToggle}
          aria-label="Collapse menu"
          className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg text-white/40 transition-all hover:bg-white/10 hover:text-white ${collapsed ? 'hidden' : 'ml-auto'}`}
        >
          <ChevronLeft size={13} />
        </button>
      </div>

      {collapsed && (
        <button onClick={onToggle} aria-label="Expand menu" className="flex justify-center border-b border-white/10 py-3 text-white/40 transition-colors hover:text-white">
          <ChevronLeft size={13} className="rotate-180" />
        </button>
      )}

      {!collapsed && (
        <div className="mx-3 my-3 rounded-xl border border-white/10 bg-white/10 p-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/20">
              <CircleUserRound size={20} className="text-white" strokeWidth={1.5} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{currentUser?.name}</p>
              <p className="truncate text-[10px] text-white/50">{currentUser?.city}</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold text-white">{currentUser?.role}</span>
            <span className="truncate text-[10px] text-white/50">
              {currentUser?.branch || currentUser?.region || currentUser?.zone || 'Central'}
            </span>
          </div>
        </div>
      )}

      {!collapsed && <p className="mb-1 px-5 text-[10px] font-semibold uppercase tracking-widest text-white/30">Menu</p>}

      <nav className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto px-2.5 pb-2">
        {items.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''} ${collapsed ? 'justify-center px-0' : ''}`}
          >
            <Icon size={16} className="flex-shrink-0" />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="flex-shrink-0 border-t border-white/10 px-2.5 py-3">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`nav-item w-full text-left text-white/40 hover:bg-red-500/10 hover:text-red-300 ${collapsed ? 'justify-center px-0' : ''}`}
        >
          <LogOut size={15} className="flex-shrink-0" />
          {!collapsed && <span>Sign Out</span>}
        </button>
        {!collapsed && <p className="mt-3 text-center text-[10px] text-white/25">v2.1 · Fristine Infotech</p>}
      </div>
    </aside>
  )
}

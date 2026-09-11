import { useEffect, useMemo, useState } from 'react'
import { CircleUserRound, Lock, Map, Package, Search, Settings, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { USERS, loginActivity, usersById } from '../data/crm'
import { ACTIONS, PERMISSIONS, ROLES, ROLE_CODES, TBC, can, canDownloadPii } from '../config/roles'
import { RoleBadge } from '../components/Badges'
import ChartCard from '../components/charts/ChartCard'
import { ordinalSteps, STATUS } from '../theme/chartTheme'
import { auditEvents } from '../logic/auditTrail'
import Pagination, { usePagination } from '../components/Pagination'
import CreateUserModal from '../components/modals/CreateUserModal'
import EntitlementModal from '../components/modals/EntitlementModal'
import { getUsers, setUserStatus, subscribe as subscribeUsers, userVersion } from '../logic/userStore'
import {
  entitlementSummary, entitlementVersion, restrictedCount,
  subscribe as subscribeEntitlements,
} from '../logic/entitlementStore'
import ProductMaster from '../components/admin/ProductMaster'
import TerritoryMaster from '../components/admin/TerritoryMaster'

/**
 * User administration. Gated on the UAM permission, which the matrix grants to
 * the IT Team and the Super User only.
 */
export default function UserAdmin() {
  const { currentUser, role } = useAuth()
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [tab, setTab] = useState('users')
  const [creating, setCreating] = useState(false)
  const [flash, setFlash] = useState(null)
  const [userV, setUserV] = useState(userVersion())
  useEffect(() => subscribeUsers(() => setUserV(userVersion())), [])
  const [entitling, setEntitling] = useState(null)
  const [entVersion, setEntVersion] = useState(entitlementVersion())
  useEffect(() => subscribeEntitlements(() => setEntVersion(entitlementVersion())), [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const restricted = useMemo(() => restrictedCount(), [entVersion])

  const logins = useMemo(() => Object.fromEntries(loginActivity().map((l) => [l.id, l])), [])

  // Reads the store, not the frozen import: created users and status changes
  // both live there now, so they survive a reload and are visible app-wide.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = useMemo(() => getUsers(), [userV])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false
      if (!q) return true
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.id.includes(q)
    })
  }, [users, search, roleFilter])

  const { pageRows, props: pageProps } = usePagination(filtered, {
    resetOn: [search, roleFilter, tab],
  })

  const byRole = useMemo(
    () => ROLE_CODES.map((code) => ({ name: code, value: users.filter((u) => u.role === code).length })).filter((r) => r.value),
    [users],
  )

  if (!can(role, 'uam')) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center animate-fade-in">
        <Lock size={22} className="mx-auto mb-3 text-slate-300" />
        <h2 className="text-base font-bold text-gray-900">User administration is restricted</h2>
        <p className="mt-1 text-sm text-slate-500">
          The permission matrix grants UAM to the IT Team and Super User only. Your role is {role}.
        </p>
      </div>
    )
  }

  const toggleStatus = (u) => {
    const next = u.status === 'Inactive' ? 'Active' : 'Inactive'
    setUserStatus(u.id, next)
    auditEvents.userStatusChanged(currentUser, u, next)
  }

  // MOM 8 Sep: creation is Super Admin only — narrower than the UAM permission,
  // which the matrix also grants to the IT Team.
  const mayCreateUser = role === 'SUPER'

  const active = users.filter((u) => u.status !== 'Inactive').length

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="card flex flex-wrap items-start justify-between gap-4 p-5">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Settings size={20} className="text-[#861D3F]" /> User Administration
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {users.length} users configured · {active} active · platform sized for 1,200+
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-af-border bg-af-bg p-1">
          {/* MOM 8 Sep: retain Users, Permissions, Product Master and Territory
              Master as Admin-only; Promo Codes deleted, Campaigns moved to the
              dashboard. Hierarchy stays as the Input Sheet's reference view. */}
          {[
            ['users', 'Users'],
            ['matrix', 'Permission matrix'],
            ['products', 'Product Master'],
            ['territory', 'Territory Master'],
            ['hierarchy', 'Hierarchy'],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all
                ${tab === k ? 'bg-[#861D3F] text-white' : 'text-slate-500 hover:bg-white hover:text-[#861D3F]'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'users' && (
        <>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard
              title="Users by Role"
              subtitle={`${byRole.length} roles in use`}
              icon={Users}
              kind="share"
              data={byRole}
              nameKey="name"
              valueKey="value"
              xLabel="Role"
              height={220}
              types={['hbar', 'donut', 'table']}
              defaultType="hbar"
              colors={ordinalSteps(byRole.length)}
            />
            <div className="card p-4 lg:col-span-2">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Governance in force
              </p>
              <div className="space-y-2.5 text-xs text-slate-600">
                {[
                  'User creation is restricted to the Super User.',
                  'Phone number and address are not downloadable for DST, SM, AH or RH.',
                  'Records archive after 2 years and remain retrievable till date.',
                  'Rejected leads leave the All Leads view and purge at 60 days.',
                  'Ageing and escalation run at 3 days, uniform across statuses.',
                ].map((t) => (
                  <div key={t} className="flex items-start gap-2">
                    <ShieldCheck size={13} className="mt-0.5 flex-shrink-0 text-[#861D3F]" />
                    <p>{t}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Name, email or user ID…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-64 pl-9"
              />
            </div>
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="input-field w-auto">
              <option value="all">All roles</option>
              {ROLE_CODES.map((c) => <option key={c} value={c}>{c} — {ROLES[c].name}</option>)}
            </select>
            <span className="text-xs text-slate-400">{filtered.length} shown</span>
            {mayCreateUser && (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="ml-auto flex items-center gap-1.5 rounded-xl bg-[#861D3F] px-3 py-2 text-xs font-semibold text-white transition-all hover:bg-[#A8284F] active:scale-[0.98]"
              >
                <UserPlus size={13} /> Create user
              </button>
            )}
            {restricted > 0 && (
              <span className="rounded-lg border border-[#861D3F]/20 bg-[#FDF0F4] px-2 py-1 text-[11px] font-semibold text-[#861D3F]">
                {restricted} on restricted product entitlement
              </span>
            )}
          </div>

          {flash && (
            <p className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-700">
              {flash}
            </p>
          )}

          <div className="card overflow-hidden">
            <div className="max-h-[520px] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 bg-af-bg">
                  <tr className="border-b border-af-border">
                    {['User', 'Role', 'Reports to', 'Posting', 'Sees', 'Products', 'Last login', 'Status', ''].map((h) => (
                      <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((u) => {
                    const mgr = u.managerId ? usersById[u.managerId] : null
                    return (
                      <tr key={u.id} className="tbl-row">
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#861D3F]">
                              <CircleUserRound size={17} className="text-white" strokeWidth={1.5} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold text-gray-800">{u.name}</p>
                              <p className="truncate text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2.5"><RoleBadge role={u.role} /></td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {mgr ? `${mgr.name} (${mgr.role})` : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">{u.branch || u.region || u.zone || 'Central'}</td>
                        <td className="px-3 py-2.5 text-[11px] text-slate-500">{ROLES[u.role]?.scope}</td>
                        <td className="px-3 py-2.5">
                          {/* MOM design point: product entitlement configured per user. */}
                          <button
                            onClick={() => setEntitling(u)}
                            title="Configure product entitlement"
                            className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-[10px] font-semibold transition-colors ${
                              entitlementSummary(u.id) === 'All products'
                                ? 'border-af-border bg-af-bg text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]'
                                : 'border-[#861D3F]/25 bg-[#FDF0F4] text-[#861D3F]'
                            }`}
                          >
                            {entitlementSummary(u.id)}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-500">
                          {logins[u.id]?.lastLogin || <span className="text-slate-300">never</span>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`badge-status ${u.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => toggleStatus(u)}
                            className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition-colors ${
                              u.status === 'Inactive'
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-600 hover:bg-red-100'
                            }`}
                          >
                            {u.status === 'Inactive' ? 'Activate' : 'Deactivate'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <Pagination {...pageProps} noun="users" />
          </div>
        </>
      )}

      {tab === 'matrix' && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
            <ShieldCheck size={15} className="text-[#861D3F]" />
            <h3 className="section-title">Role permission matrix — as supplied by AFL</h3>
            <span className="ml-auto text-xs text-slate-400">{ROLE_CODES.length} roles × {ACTIONS.length} actions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-af-border bg-af-bg">
                  <th className="sticky left-0 z-10 bg-af-bg px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">Role</th>
                  {ACTIONS.map((a) => (
                    <th key={a.key} className="px-2 py-2.5 text-center text-[10px] font-semibold text-slate-400" style={{ minWidth: 78 }}>
                      {a.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_CODES.map((code) => (
                  <tr key={code} className="tbl-row">
                    <td className="sticky left-0 z-10 bg-white px-3 py-2.5">
                      <p className="text-xs font-semibold text-gray-800">{code}</p>
                      <p className="text-[10px] text-slate-400">{ROLES[code].name}</p>
                    </td>
                    {ACTIONS.map((a) => {
                      const allowed = PERMISSIONS[code][a.key]
                      const piiCaveat = a.pii && allowed && !canDownloadPii(code)
                      return (
                        <td key={a.key} className="px-2 py-2.5 text-center">
                          {allowed ? (
                            <span
                              className="inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold"
                              style={{ background: piiCaveat ? '#FEF3C7' : '#FDF0F4', color: piiCaveat ? '#92400E' : '#861D3F' }}
                              title={piiCaveat ? 'Allowed, but phone and address are excluded' : 'Allowed'}
                            >
                              {piiCaveat ? 'Ltd' : 'Yes'}
                            </span>
                          ) : (
                            <span className="text-slate-200">—</span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-af-border bg-af-bg px-4 py-2.5 text-[11px] text-slate-500">
            <strong className="text-slate-600">Ltd</strong> = permitted, but phone number and address are stripped from
            downloads — the DPDP restriction for DST through RH.
          </p>
        </div>
      )}

      {tab === 'products' && <ProductMaster />}

      {tab === 'territory' && <TerritoryMaster />}

      {tab === 'hierarchy' && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-af-border px-4 py-3.5">
            <Users size={15} className="text-[#861D3F]" />
            <h3 className="section-title">Role hierarchy and data visibility</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-af-border bg-af-bg">
                {['Level', 'Code', 'Designation', 'Reports to', 'Can see data of', 'Can allocate', 'Users'].map((h) => (
                  <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLE_CODES.map((code) => {
                const r = ROLES[code]
                const count = USERS.filter((u) => u.role === code).length
                return (
                  <tr key={code} className="tbl-row">
                    <td className="px-3 py-2.5 text-xs text-slate-500">{r.level ?? '—'}</td>
                    <td className="px-3 py-2.5"><RoleBadge role={code} /></td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-gray-800">{r.designation}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">
                      {r.reportsTo === TBC ? <span className="text-amber-600">To be confirmed</span> : r.reportsTo || '—'}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{r.scope}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {r.canAllocateLeads === TBC ? (
                        <span className="text-amber-600">To be confirmed</span>
                      ) : r.canAllocateLeads ? (
                        <span className="font-semibold text-[#861D3F]">Yes</span>
                      ) : (
                        <span className="text-slate-400">No</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-700" style={{ fontVariantNumeric: 'tabular-nums' }}>{count}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <p className="border-t border-af-border bg-af-bg px-4 py-2.5 text-[11px] text-slate-500">
            Cells marked <span className="font-semibold text-amber-700">To be confirmed</span> are the ones AFL left open
            on the Hierarchy tab — they are shown as pending rather than assumed.
          </p>
        </div>
      )}
      {creating && (
        <CreateUserModal
          actor={currentUser}
          onClose={() => setCreating(false)}
          onDone={(u) => setFlash(`${u.name} created as ${u.role} (${u.id}). They are in the allocation pool and the audit trail.`)}
        />
      )}

      {entitling && (
        <EntitlementModal
          user={entitling}
          actor={currentUser}
          onClose={() => setEntitling(null)}
        />
      )}
    </div>
  )
}

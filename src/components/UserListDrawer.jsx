import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleUserRound, Search, X } from 'lucide-react'
import { RoleBadge } from './Badges'
import { ROLES, ROLE_CODES } from '../config/roles'
import Pagination, { usePagination } from './Pagination'

/**
 * The Users tile drills to PEOPLE, not leads. It used to fall through to the
 * lead list, which meant clicking "Users · 161" showed 674 leads — a number
 * with no relationship to the one on the tile.
 */
export default function UserListDrawer({ users, onClose }) {
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return users.filter(
      (u) =>
        (roleFilter === 'all' || u.role === roleFilter) &&
        (!q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.branch || '').toLowerCase().includes(q)),
    )
  }, [users, query, roleFilter])

  const { pageRows, props: pageProps } = usePagination(rows, { resetOn: [query, roleFilter] })

  const active = users.filter((u) => u.status !== 'Inactive').length
  const signedIn = users.filter((u) => u.login?.lastLogin).length
  const rolesPresent = ROLE_CODES.filter((c) => users.some((u) => u.role === c))

  const kpis = [
    { label: 'Total accounts', value: users.length },
    { label: 'Active', value: active },
    { label: 'Inactive', value: users.length - active },
    { label: 'Have signed in', value: signedIn },
  ]

  return createPortal(
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-slate-900/25 backdrop-blur-[1px]" onClick={onClose} />
      <aside className="animate-slide-up relative z-10 flex h-full w-full max-w-3xl flex-col bg-af-bg shadow-2xl">
        <header className="flex flex-shrink-0 items-start gap-3 border-b border-af-border bg-white px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-gray-900">Users you can see</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {users.length.toLocaleString('en-IN')} account{users.length === 1 ? '' : 's'} across{' '}
              {rolesPresent.length} role{rolesPresent.length === 1 ? '' : 's'}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-af-bg hover:text-slate-700"
          >
            <X size={16} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5">
          <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {kpis.map((k) => (
              <div key={k.label} className="card px-3.5 py-3">
                <p className="text-lg font-bold leading-none text-slate-800" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {k.value.toLocaleString('en-IN')}
                </p>
                <p className="mt-1 text-[11px] text-slate-400">{k.label}</p>
              </div>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px] flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email or posting"
                className="h-9 w-full rounded-xl border border-af-border bg-white pl-9 pr-3 text-sm outline-none focus:border-[#861D3F]"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-xl border border-af-border bg-white px-3 text-sm text-slate-600 outline-none focus:border-[#861D3F]"
            >
              <option value="all">All roles</option>
              {rolesPresent.map((c) => (
                <option key={c} value={c}>{c} — {ROLES[c].name}</option>
              ))}
            </select>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-af-bg">
                <tr className="border-b border-af-border">
                  {['User', 'Role', 'Posting', 'Last sign-in', 'Touchpoints', 'Status'].map((h) => (
                    <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-[11px] font-semibold text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((u) => (
                  <tr key={u.id} className="tbl-row">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl bg-[#FDF0F4] text-[10px] font-bold text-[#861D3F]">
                          {u.avatar}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold text-gray-800">{u.name}</span>
                          <span className="block truncate text-[10px] text-slate-400">{u.email}</span>
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2.5"><RoleBadge role={u.role} /></td>
                    <td className="px-3 py-2.5 text-[11px] text-slate-500">
                      {u.branch || u.region || u.zone || 'Central'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                      {u.login?.lastLogin || <span className="text-slate-300">never</span>}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {u.login?.touchpoints ?? 0}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`badge-status ${u.status === 'Inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {u.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-400">No user matches that search</td></tr>
                )}
              </tbody>
            </table>
            <Pagination {...pageProps} noun="users" />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

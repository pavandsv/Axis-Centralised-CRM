import { useMemo, useState } from 'react'
import { Check, Package } from 'lucide-react'
import Modal, { CancelButton, inputCls, labelCls } from './Modal'
import { PORTFOLIOS, PRODUCTS, PRODUCT_NAMES } from '../../data/masters'
import { PRODUCT_ENTITLEMENT } from '../../config/roles'
import { entitlementFor, entitlementTier, setEntitlement } from '../../logic/entitlementStore'
import { auditEvents } from '../../logic/auditTrail'

/**
 * Per-user product entitlement — the MOM's answer to "8 to 9 HO users on
 * differing product entitlements". The role's tier caps the selection: a
 * single-product role can hold one, everyone above can hold many.
 */
export default function EntitlementModal({ user, actor, onClose, onDone }) {
  const tier = entitlementTier(user.role)
  const single = tier === PRODUCT_ENTITLEMENT.SINGLE
  const [chosen, setChosen] = useState(() => new Set(entitlementFor(user.id) || PRODUCT_NAMES))
  const [query, setQuery] = useState('')

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase()
    return PORTFOLIOS.map((portfolio) => ({
      portfolio,
      products: PRODUCTS.filter((p) => p.portfolio === portfolio && (!q || p.name.toLowerCase().includes(q))),
    })).filter((g) => g.products.length)
  }, [query])

  const toggle = (name) =>
    setChosen((prev) => {
      if (single) return new Set([name])
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const all = chosen.size === PRODUCT_NAMES.length

  const submit = () => {
    const list = [...chosen]
    const summary = all || !list.length ? 'all products' : list.join(', ')
    setEntitlement(user.id, list)
    // Changing what a user can see is a governance event, so it belongs in the
    // trail next to activation and deactivation.
    auditEvents.entitlementChanged(actor, user, summary)
    onDone?.({ user, summary })
    onClose()
  }

  return (
    <Modal title="Product entitlement" icon={Package} onClose={onClose}>
      <div className="mb-4 rounded-xl border border-af-border bg-af-bg px-3.5 py-3">
        <p className="text-sm font-semibold text-gray-800">{user.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {user.role} · {user.email}
        </p>
        <p className="mt-1 text-[10px] text-slate-400">
          {single
            ? 'This role is a single-product tier — choosing one replaces the other.'
            : 'This role may hold several products. Selecting every product means no restriction.'}
        </p>
      </div>

      <label className={labelCls}>Find a product</label>
      <input className={inputCls} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Product name" />

      {!single && (
        <div className="mt-2 flex gap-2">
          <button
            type="button"
            onClick={() => setChosen(new Set(PRODUCT_NAMES))}
            className="rounded-lg border border-af-border px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setChosen(new Set())}
            className="rounded-lg border border-af-border px-2 py-1 text-[11px] font-semibold text-slate-500 hover:border-[#861D3F]/40 hover:text-[#861D3F]"
          >
            Clear
          </button>
          <span className="ml-auto self-center text-[11px] text-slate-400">
            {all ? 'All products (no restriction)' : `${chosen.size} selected`}
          </span>
        </div>
      )}

      <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-af-border p-2">
        {grouped.map((g) => (
          <div key={g.portfolio} className="mb-2 last:mb-0">
            <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {g.portfolio}
            </p>
            {g.products.map((p) => {
              const on = chosen.has(p.name)
              return (
                <button
                  key={p.code}
                  type="button"
                  onClick={() => toggle(p.name)}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                    on ? 'bg-[#FDF0F4]' : 'hover:bg-af-bg'
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                      on ? 'border-[#861D3F] bg-[#861D3F] text-white' : 'border-slate-300'
                    }`}
                  >
                    {on && <Check size={11} />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-gray-800">{p.name}</span>
                  <span className="flex-shrink-0 font-mono text-[10px] text-slate-400">{p.code}</span>
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <CancelButton onClick={onClose} />
        <button type="button" onClick={submit} className="btn-primary">
          Save entitlement
        </button>
      </div>
    </Modal>
  )
}

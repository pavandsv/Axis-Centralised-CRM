import { PRODUCTS } from '../data/masters'
import { roleBadgeCode, roleLabel } from '../config/roles'
import { STATUS } from '../theme/chartTheme'

export const cx = (...parts) => parts.filter(Boolean).join(' ')

/**
 * The nine lead statuses from the Lead Module sheet. Terminal outcomes borrow the
 * reserved status palette (they genuinely mean good/bad); working states use
 * neutral tints so red is kept for things that are actually wrong. Every badge
 * carries its label, so colour never has to carry the meaning alone.
 */
const STATUS_STYLE = {
  New: { cls: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
  'Not reachable': { cls: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
  'Not interested': { cls: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' },
  'Follow-up': { cls: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  'Login Initiated': { cls: 'bg-indigo-50 text-indigo-700', dot: 'bg-indigo-500' },
  Sanctioned: { cls: 'bg-teal-50 text-teal-700', dot: 'bg-teal-600' },
  Disbursed: { cls: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-600' },
  Rejected: { cls: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
  Duplicate: { cls: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
}

export function StatusBadge({ status }) {
  const cfg = STATUS_STYLE[status] || STATUS_STYLE.New
  return (
    <span className={cx('badge-status whitespace-nowrap', cfg.cls)}>
      <span className={cx('h-1.5 w-1.5 flex-shrink-0 rounded-full', cfg.dot)} />
      {status}
    </span>
  )
}

/** Portfolio drives the colour; the product's own code is the label. */
export const PORTFOLIO_STYLE = {
  'Retail Personal Loans': 'bg-blue-50 text-blue-700 border-blue-200',
  'Retail Home Loans': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Loan Against Property': 'bg-teal-50 text-teal-700 border-teal-200',
  'Business & MSME Loans': 'bg-violet-50 text-violet-700 border-violet-200',
  'Vehicle & Consumer Loans': 'bg-amber-50 text-amber-700 border-amber-200',
  'Gold & Secured Loans': 'bg-yellow-50 text-yellow-800 border-yellow-200',
  'Professional Loans': 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

const PRODUCT_BY_NAME = Object.fromEntries(PRODUCTS.map((p) => [p.name, p]))

export function ProductBadge({ product, showName = false }) {
  const meta = PRODUCT_BY_NAME[product]
  if (!meta) {
    return (
      <span className="whitespace-nowrap rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
        {product || '—'}
      </span>
    )
  }
  const cls = PORTFOLIO_STYLE[meta.portfolio] || 'bg-slate-50 text-slate-600 border-slate-200'
  return (
    <span
      title={`${meta.name} · ${meta.portfolio}`}
      className={cx('whitespace-nowrap rounded-lg border px-2 py-0.5 text-[10px] font-bold', cls)}
    >
      {showName ? meta.name : meta.code}
    </span>
  )
}

export function RoleBadge({ role }) {
  return (
    <span
      title={roleLabel(role)}
      className="whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
    >
      {roleBadgeCode(role)}
    </span>
  )
}

/** Ageing against AFL's 3-day rule, with the number stated — never colour alone. */
export function AgeingBadge({ days, threshold = 3 }) {
  const breached = days >= threshold
  return (
    <span
      className={cx('badge-status whitespace-nowrap', breached ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}
    >
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: breached ? STATUS.critical : STATUS.good }}
      />
      {days}d in status
    </span>
  )
}

/**
 * Retained for the screens not yet migrated. Under AFL's rules there is no
 * 2-hour SLA — compliance is measured against the 3-day ageing threshold — so
 * this reports "within rule" / "breached" rather than the old escalation chain.
 */
export function SlaBadge({ breached }) {
  return (
    <span className={cx('badge-status whitespace-nowrap', breached ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700')}>
      <span
        className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: breached ? STATUS.critical : STATUS.good }}
      />
      {breached ? 'Ageing breach' : 'Within rule'}
    </span>
  )
}

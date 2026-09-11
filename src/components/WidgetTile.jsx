import {
  AlertTriangle, ArrowRight, BadgeCheck, IndianRupee, PhoneCall, Target, Users,
} from 'lucide-react'
import { STATUS } from '../theme/chartTheme'

/**
 * A stat tile — the right form for a single headline number (a one-bar chart
 * would be worse). `kind` tells the reader whether the number is a stock ("as
 * of today") or a flow ("in this period"), which is the difference between
 * "415 open leads" and "14 disbursed this month".
 */

const ICONS = {
  users: Users,
  openLeads: Target,
  contacted: PhoneCall,
  untouched: AlertTriangle,
  qualified: BadgeCheck,
  disbursed: IndianRupee,
}

export default function WidgetTile({ widget, active, onClick }) {
  // Only a genuine breach gets alarm colour. Everything else is near-black and
  // lets the icon chip carry the accent — six differently-coloured numbers in a
  // row is decoration, not information, and green/amber are reserved for state.
  const alarm = widget.tone === 'critical' && widget.value > 0
  const Icon = ICONS[widget.key] || Target

  return (
    <button
      type="button"
      onClick={onClick}
      title={widget.detail}
      data-active={active ? 'true' : undefined}
      className={`group stat-card card-interactive items-start text-left
        ${active ? 'ring-2 ring-[#861D3F] ring-offset-1' : ''}`}
    >
      <div className="mb-3 flex w-full items-center gap-2.5">
        <span
          className="icon-chip"
          style={alarm ? { background: '#FEF2F2', color: STATUS.critical } : undefined}
        >
          <Icon size={15} strokeWidth={2} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-semibold text-slate-600">{widget.label}</span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-wider text-slate-400">
            {widget.kind === 'flow' ? 'in period' : 'as of today'}
          </span>
        </span>
      </div>

      {/* Fixed height on the value + caption block, so six tiles of differing
          label lengths still share one baseline across the row. */}
      <div className="flex min-h-[52px] w-full flex-col justify-start">
        <p
          className="text-[28px] font-bold leading-none tracking-tight"
          style={{ color: alarm ? STATUS.critical : '#1E2939', fontVariantNumeric: 'tabular-nums' }}
        >
          {typeof widget.value === 'number' ? widget.value.toLocaleString('en-IN') : widget.value}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-slate-400">{widget.sub}</p>
      </div>

      <span className="mt-2 flex items-center gap-1 text-[10px] font-semibold text-slate-300 transition-colors group-hover:text-[#861D3F]">
        View leads
        <ArrowRight size={10} className="transition-transform duration-200 group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

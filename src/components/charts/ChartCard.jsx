import { useState } from 'react'
import { AreaChart, BarChart2, BarChart3, Layers, LineChart, MousePointerClick, PieChart, Table } from 'lucide-react'
import {
  AreaSeries,
  BarSeries,
  DonutShare,
  HorizontalBars,
  LineSeries,
  StackedSeries,
} from './chartRenderers'
import { CHROME, seriesColor } from '../../theme/chartTheme'

/**
 * Chart types offered in the switcher. `kind` gates which are even offered, so a
 * reader can never pick a form that misrepresents the data — no pie of a time
 * series, no line across nominal categories.
 */
const TYPES = {
  area:    { label: 'Area',       icon: AreaChart, kind: 'series' },
  line:    { label: 'Line',       icon: LineChart, kind: 'series' },
  bar:     { label: 'Columns',    icon: BarChart3, kind: 'series' },
  stacked: { label: 'Stacked',    icon: Layers,    kind: 'series' },
  hbar:    { label: 'Bars',       icon: BarChart2, kind: 'share' },
  donut:   { label: 'Donut',      icon: PieChart,  kind: 'share' },
  table:   { label: 'Table',      icon: Table,     kind: 'both' },
}

function TypeSwitcher({ types, value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Change chart type"
      className="flex items-center gap-0.5 rounded-xl border border-af-border bg-af-bg p-0.5"
    >
      {types.map((t) => {
        const cfg = TYPES[t]
        if (!cfg) return null
        const Icon = cfg.icon
        const active = value === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            title={cfg.label}
            aria-label={`Show as ${cfg.label}`}
            aria-pressed={active}
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition-all duration-150
              ${active ? 'bg-[#861D3F] text-white shadow-sm' : 'text-slate-400 hover:bg-white hover:text-[#861D3F]'}`}
          >
            <Icon size={13} />
          </button>
        )
      })}
    </div>
  )
}

/** Legend is always present for two or more series, never for one. */
function Legend({ series, isLine }) {
  if (series.length < 2) return null
  return (
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
      {series.map((s, i) => (
        <span key={s.key} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block flex-shrink-0"
            style={
              isLine
                ? { width: 12, height: 2, borderRadius: 1, background: s.color || seriesColor(s.key, i) }
                : { width: 8, height: 8, borderRadius: 2, background: s.color || seriesColor(s.key, i) }
            }
          />
          <span className="text-xs" style={{ color: CHROME.textSecondary }}>
            {s.label}
          </span>
        </span>
      ))}
    </div>
  )
}

/** The WCAG-clean twin every chart carries. Values here are never gated by hover. */
function TableView({ kind, data, xKey, series, nameKey, valueKey, valueFormat, xLabel, extraColumns = [], onDrill }) {
  const cols =
    kind === 'series'
      ? [{ key: xKey, label: xLabel || 'Period', text: true }, ...series, ...extraColumns]
      : [{ key: nameKey, label: xLabel || 'Category', text: true }, { key: valueKey, label: 'Value' }, ...extraColumns]

  // Counts total; a derived ratio does not — summing percentages is nonsense.
  const totals =
    kind === 'series'
      ? [...series.map((s) => data.reduce((acc, r) => acc + (Number(r[s.key]) || 0), 0)), ...extraColumns.map(() => null)]
      : [data.reduce((acc, r) => acc + (Number(r[valueKey]) || 0), 0), ...extraColumns.map(() => null)]

  return (
    <div className="max-h-[320px] overflow-auto">
      <table className="w-full">
        <thead className="sticky top-0 bg-white">
          <tr className="border-b border-af-border">
            {cols.map((c) => (
              <th
                key={c.key}
                className={`px-3 py-2 text-xs font-semibold ${c.text ? 'text-left' : 'text-right'}`}
                style={{ color: CHROME.textMuted }}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={`tbl-row ${onDrill ? 'cursor-pointer' : ''}`}
              onClick={onDrill ? () => onDrill({ label: row[kind === 'series' ? xKey : nameKey], datum: row }) : undefined}
            >
              {cols.map((c) => (
                <td
                  key={c.key}
                  className={`px-3 py-2 text-xs ${c.text ? 'text-left font-medium text-gray-800' : 'text-right'}`}
                  style={c.text ? undefined : { fontVariantNumeric: 'tabular-nums', color: CHROME.textSecondary }}
                >
                  {c.text
                    ? row[c.key]
                    : c.render
                      ? c.render(row)
                      : valueFormat
                        ? valueFormat(row[c.key])
                        : (row[c.key] ?? 0).toLocaleString('en-IN')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-af-border bg-af-bg">
            <td className="px-3 py-2 text-xs font-semibold text-gray-700">Total</td>
            {totals.map((t, i) => (
              <td
                key={i}
                className="px-3 py-2 text-right text-xs font-semibold text-gray-800"
                style={{ fontVariantNumeric: 'tabular-nums' }}
              >
                {t == null ? '—' : valueFormat ? valueFormat(t) : t.toLocaleString('en-IN')}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

/**
 * A chart in a card, with the type switcher in the top-right.
 *
 * kind="series" — rows keyed by `xKey` with one or more `series` [{key,label}]
 * kind="share"  — rows of {[nameKey], [valueKey]}, part-to-whole
 */
export default function ChartCard({
  title,
  subtitle,
  icon: Icon,
  kind = 'series',
  data = [],
  xKey = 'month',
  xLabel,
  series = [],
  nameKey = 'name',
  valueKey = 'value',
  types,
  defaultType,
  height = 220,
  yFormat,
  valueFormat,
  formatter,
  labelFormatter,
  colors,
  centerLabel,
  centerValue,
  action,
  tooltipExtra,
  nestedAreas = false,
  extraColumns = [],
  onDrill,
  drillHint = 'Click any bar to see the leads behind it',
  className = '',
  children,
}) {
  const requested =
    types || (kind === 'series' ? ['area', 'line', 'bar', 'stacked', 'table'] : ['donut', 'hbar', 'table'])

  // The job picks the form. A single data point cannot express a trend — a line
  // or area across one x-value draws nothing — so those forms are withdrawn
  // rather than offered and shown empty.
  const tooFewForTrend = kind === 'series' && data.length < 2
  const available = tooFewForTrend ? requested.filter((t) => t !== 'area' && t !== 'line') : requested

  const preferred = defaultType && available.includes(defaultType) ? defaultType : available[0]
  const [chosen, setChosen] = useState(preferred)
  // If the slice shrinks to one point while a line form is selected, fall back.
  const type = available.includes(chosen) ? chosen : preferred
  const setType = setChosen

  const empty = !data.length
  const isLine = type === 'area' || type === 'line'

  const body = () => {
    if (empty) {
      return (
        <div className="flex items-center justify-center" style={{ height }}>
          <p className="text-sm text-slate-400">No data for this selection</p>
        </div>
      )
    }
    if (type === 'table') {
      return (
        <TableView
          kind={kind}
          data={data}
          xKey={xKey}
          xLabel={xLabel}
          series={series}
          nameKey={nameKey}
          valueKey={valueKey}
          valueFormat={valueFormat}
          extraColumns={extraColumns}
          onDrill={onDrill}
        />
      )
    }
    const common = { data, height, yFormat, formatter, labelFormatter, tooltipExtra, onDrill }
    if (kind === 'series') {
      const props = { ...common, xKey, series }
      if (type === 'line') return <LineSeries {...props} />
      if (type === 'bar') return <BarSeries {...props} />
      if (type === 'stacked') return <StackedSeries {...props} />
      return <AreaSeries {...props} nested={nestedAreas} />
    }
    const props = { ...common, nameKey, valueKey, colors }
    if (type === 'hbar') return <HorizontalBars {...props} />
    return <DonutShare {...props} centerLabel={centerLabel} centerValue={centerValue} />
  }

  return (
    <div className={`card p-4 ${className}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="flex-shrink-0 text-[#861D3F]" />}
            <h3 className="section-title truncate">{title}</h3>
          </div>
          {subtitle && <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>}
          {onDrill && (
            <p className="mt-1 flex items-center gap-1 text-[10px] font-medium text-[#861D3F]/70">
              <MousePointerClick size={10} /> {drillHint}
            </p>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {action}
          <TypeSwitcher types={available} value={type} onChange={setType} />
        </div>
      </div>

      {kind === 'series' && type !== 'table' && (
        <div className="mb-2">
          <Legend series={series} isLine={isLine} />
        </div>
      )}

      {body()}
      {children}
    </div>
  )
}

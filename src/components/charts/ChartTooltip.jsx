import { CHROME, SURFACE } from '../../theme/chartTheme'

/**
 * One tooltip listing EVERY series at the hovered X, so the pointer never has to
 * land on a particular line to get a value. The value leads (high contrast,
 * semibold); the series name is secondary — the legend's hierarchy inverted,
 * because here the reader already knows the series and wants the number.
 * Series are keyed by a short stroke of their colour, not a filled box.
 */
export default function ChartTooltip({ active, payload, label, formatter, labelFormatter, extra }) {
  if (!active || !payload || !payload.length) return null
  const rows = payload.filter((p) => p.value != null)
  if (!rows.length) return null

  return (
    <div
      className="rounded-xl border border-af-border bg-white px-3.5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)]"
      style={{ minWidth: 148 }}
    >
      <p className="mb-1.5 text-[11px] font-semibold" style={{ color: CHROME.textSecondary }}>
        {labelFormatter ? labelFormatter(label) : label}
      </p>
      <div className="space-y-1">
        {rows.map((row) => (
          <div key={row.dataKey ?? row.name} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              {/* line key, not a box — a filled swatch is data-weight ink at this density */}
              <span
                aria-hidden
                style={{
                  width: 12,
                  height: 2,
                  borderRadius: 1,
                  background: row.color || row.payload?.fill,
                  display: 'inline-block',
                }}
              />
              <span className="text-[11px]" style={{ color: CHROME.textSecondary }}>
                {row.name}
              </span>
            </span>
            <span
              className="text-xs font-semibold"
              style={{ color: CHROME.textPrimary, fontVariantNumeric: 'tabular-nums' }}
            >
              {formatter ? formatter(row.value, row.dataKey) : row.value?.toLocaleString('en-IN')}
            </span>
          </div>
        ))}
      </div>
      {/* A derived figure that must NOT become a second y-axis — a ratio belongs
          beside the counts, not plotted against them. */}
      {extra && rows[0]?.payload && (
        <p
          className="mt-2 border-t border-af-border pt-1.5 text-[11px]"
          style={{ color: CHROME.textMuted }}
        >
          {extra(rows[0].payload)}
        </p>
      )}
    </div>
  )
}

/** Shared cursor styling: a hairline crosshair for line/area, a wash for bars. */
export const CROSSHAIR = { stroke: '#CBD5E1', strokeWidth: 1 }
export const BAR_CURSOR = { fill: 'rgba(15,23,42,0.03)' }
export const TOOLTIP_WRAPPER = { outline: 'none' }
export { SURFACE }

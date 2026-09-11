// ---------------------------------------------------------------------------
// Lead volume across India.
//
// A choropleth is a SEQUENTIAL encoding — one hue, light to dark, carrying
// magnitude — so it uses the ordinal maroon ramp, not the categorical set.
// Colour alone never states a number: every state carries a tooltip, the
// legend gives the bucket boundaries, and the card offers a table view.
//
// States with no branch are drawn in the surface grey, not the lightest ramp
// step: "AFL does not operate here" and "AFL operates here and got nothing"
// are different facts and must not share an ink.
// ---------------------------------------------------------------------------
import { useMemo, useState } from 'react'
import { INDIA_STATES, MAP_VIEWBOX } from '../../data/indiaMap'
import { CHROME, ORDINAL_MAROON } from '../../theme/chartTheme'

const NO_DATA = '#EEF1F5'
const NO_DATA_STROKE = '#DFE4EA'

/** Quantile buckets: lead volume is long-tailed, so equal-width steps would
 *  put Maharashtra alone in the top bucket and flatten everything else. */
function bucketize(values, steps) {
  const sorted = [...values].sort((a, b) => a - b)
  if (!sorted.length) return []
  const cuts = []
  for (let i = 1; i < steps; i++) {
    cuts.push(sorted[Math.floor((i / steps) * sorted.length)])
  }
  return cuts
}

export default function IndiaMap({ rows, onDrill, height = 460, metricLabel = 'leads' }) {
  const [hover, setHover] = useState(null)

  const byState = useMemo(() => {
    const m = new Map()
    for (const r of rows) m.set(r.name, r.value)
    return m
  }, [rows])

  const { colourFor, cuts, max } = useMemo(() => {
    const values = rows.map((r) => r.value).filter((v) => v > 0)
    const steps = ORDINAL_MAROON.length
    const cuts = bucketize(values, steps)
    const colourFor = (v) => {
      if (v == null) return NO_DATA
      if (v === 0) return ORDINAL_MAROON[0]
      let i = 0
      while (i < cuts.length && v > cuts[i]) i++
      return ORDINAL_MAROON[Math.min(i, steps - 1)]
    }
    return { colourFor, cuts, max: values.length ? Math.max(...values) : 0 }
  }, [rows])

  const hovered = hover ? { name: hover, value: byState.get(hover) } : null

  return (
    <div className="relative px-4 pb-3">
      <svg
        viewBox={MAP_VIEWBOX}
        role="img"
        aria-label={`Lead volume by state. ${rows.length} states with activity.`}
        style={{ width: '100%', height, display: 'block' }}
      >
        {INDIA_STATES.map((s) => {
          const value = byState.get(s.name)
          const active = value != null
          const isHover = hover === s.name
          return (
            <path
              key={s.name}
              d={s.d}
              fill={colourFor(value)}
              stroke={active ? '#FFFFFF' : NO_DATA_STROKE}
              strokeWidth={isHover ? 1.6 : 0.6}
              strokeLinejoin="round"
              style={{
                cursor: active && onDrill ? 'pointer' : 'default',
                filter: isHover ? 'brightness(1.08)' : undefined,
                transition: 'stroke-width 120ms ease',
              }}
              onMouseEnter={() => setHover(s.name)}
              onMouseLeave={() => setHover((h) => (h === s.name ? null : h))}
              onClick={active && onDrill ? () => onDrill({ label: s.name, value }) : undefined}
            >
              <title>
                {active ? `${s.name} — ${value.toLocaleString('en-IN')} ${metricLabel}` : `${s.name} — no branch`}
              </title>
            </path>
          )
        })}

        {/* Label only the states carrying real weight; more than that is clutter. */}
        {INDIA_STATES.filter((s) => (byState.get(s.name) || 0) >= max * 0.45).map((s) => (
          <text
            key={`l-${s.name}`}
            x={s.c[0]}
            y={s.c[1]}
            textAnchor="middle"
            style={{ fontSize: 10, fontWeight: 700, fill: '#FFFFFF', pointerEvents: 'none' }}
          >
            {byState.get(s.name).toLocaleString('en-IN')}
          </text>
        ))}
      </svg>

      {/* Legend: the buckets, plus the grey that is not a zero. */}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {metricLabel}
        </span>
        <span className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400">low</span>
          {ORDINAL_MAROON.map((c, i) => (
            <span
              key={c}
              title={
                i === 0
                  ? `up to ${Math.round(cuts[0] ?? max)}`
                  : i === ORDINAL_MAROON.length - 1
                    ? `above ${Math.round(cuts[cuts.length - 1] ?? 0)}`
                    : `${Math.round(cuts[i - 1] ?? 0)}–${Math.round(cuts[i] ?? max)}`
              }
              style={{ width: 20, height: 8, borderRadius: 2, background: c, display: 'inline-block' }}
            />
          ))}
          <span className="text-[10px] text-slate-400">high</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span style={{ width: 10, height: 8, borderRadius: 2, background: NO_DATA, border: `1px solid ${NO_DATA_STROKE}`, display: 'inline-block' }} />
          <span className="text-[10px] text-slate-400">no branch</span>
        </span>
      </div>

      {hovered && (
        <div className="pointer-events-none absolute right-4 top-4 rounded-xl border border-af-border bg-white px-3 py-2 shadow-[0_4px_16px_rgba(0,0,0,0.08)]">
          <p className="text-[11px] font-semibold" style={{ color: CHROME.textSecondary }}>
            {hovered.name}
          </p>
          <p className="text-sm font-bold" style={{ color: CHROME.textPrimary, fontVariantNumeric: 'tabular-nums' }}>
            {hovered.value == null ? 'No branch' : `${hovered.value.toLocaleString('en-IN')} ${metricLabel}`}
          </p>
        </div>
      )}
    </div>
  )
}

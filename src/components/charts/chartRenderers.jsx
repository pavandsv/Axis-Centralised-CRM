import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartTooltip, { BAR_CURSOR, CROSSHAIR, TOOLTIP_WRAPPER } from './ChartTooltip'
import { CHROME, MARKS, SURFACE, formatCount, seriesColor } from '../../theme/chartTheme'

const axisProps = {
  tick: { fill: CHROME.axisText, fontSize: CHROME.axisTextSize },
  axisLine: false,
  tickLine: false,
}

// Gridlines are solid hairlines one step off the surface — never dashed.
const grid = (vertical = false) => (
  <CartesianGrid stroke={CHROME.grid} strokeDasharray="0" vertical={vertical} horizontal={!vertical} />
)

const tip = (formatter, labelFormatter, bars, extra) => (
  <Tooltip
    content={<ChartTooltip formatter={formatter} labelFormatter={labelFormatter} extra={extra} />}
    cursor={bars ? BAR_CURSOR : CROSSHAIR}
    wrapperStyle={TOOLTIP_WRAPPER}
  />
)

/** Trend over time / across ordered categories. */
/** Turn a Recharts chart-level click into a drill payload. */
const seriesClick = (onDrill) =>
  onDrill
    ? (state) => {
        if (!state || !state.activeLabel) return
        const first = state.activePayload && state.activePayload[0]
        onDrill({ label: state.activeLabel, seriesKey: first?.dataKey, value: first?.value })
      }
    : undefined

const drillCursor = (onDrill) => (onDrill ? { cursor: 'pointer' } : undefined)

/**
 * @param nested  the series are subsets of one another — each value is <= the
 *   one before it, as funnel stages are. Then the areas sit inside each other
 *   rather than crossing, so they can be filled properly and read as layered
 *   bands. Without this the fills have to stay near-invisible to avoid mud,
 *   which makes "Area" indistinguishable from "Line".
 */
export function AreaSeries({ data, xKey, series, height, yFormat, formatter, labelFormatter, tooltipExtra, nested, onDrill }) {
  const top = nested ? MARKS.nestedAreaOpacityTop : MARKS.areaOpacityTop
  const bottom = nested ? MARKS.nestedAreaOpacityBottom : MARKS.areaOpacityBottom
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} onClick={seriesClick(onDrill)} style={drillCursor(onDrill)}>
        <defs>
          {series.map((s, i) => {
            const c = (s.color || seriesColor(s.key, i))
            return (
              <linearGradient key={s.key} id={`area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={top} />
                <stop offset="100%" stopColor={c} stopOpacity={bottom} />
              </linearGradient>
            )
          })}
        </defs>
        {grid()}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={yFormat || formatCount} />
        {tip(formatter, labelFormatter, false, tooltipExtra)}
        {series.map((s, i) => {
          const c = (s.color || seriesColor(s.key, i))
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c}
              strokeWidth={MARKS.lineWidth}
              fill={`url(#area-${s.key})`}
              dot={false}
              // >=8px marker with a 2px surface ring so it stays legible on crossings
              activeDot={{ r: MARKS.dotRadius, strokeWidth: MARKS.surfaceRing, stroke: SURFACE, fill: c }}
            />
          )
        })}
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function LineSeries({ data, xKey, series, height, yFormat, formatter, labelFormatter, tooltipExtra, onDrill }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} onClick={seriesClick(onDrill)} style={drillCursor(onDrill)}>
        {grid()}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={yFormat || formatCount} />
        {tip(formatter, labelFormatter, false, tooltipExtra)}
        {series.map((s, i) => {
          const c = (s.color || seriesColor(s.key, i))
          return (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c}
              strokeWidth={MARKS.lineWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              dot={false}
              activeDot={{ r: MARKS.dotRadius, strokeWidth: MARKS.surfaceRing, stroke: SURFACE, fill: c }}
            />
          )
        })}
      </LineChart>
    </ResponsiveContainer>
  )
}

/** Grouped columns — magnitude, series side by side. */
export function BarSeries({ data, xKey, series, height, yFormat, formatter, labelFormatter, tooltipExtra, onDrill }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barGap={MARKS.barGap} onClick={seriesClick(onDrill)} style={drillCursor(onDrill)}>
        {grid()}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={yFormat || formatCount} />
        {tip(formatter, labelFormatter, true, tooltipExtra)}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={(s.color || seriesColor(s.key, i))}
            radius={MARKS.barRadius}
            maxBarSize={MARKS.barMaxSize}
            cursor={onDrill ? 'pointer' : undefined}
            onClick={onDrill ? (d) => onDrill({ label: d?.payload?.[xKey], seriesKey: s.key, value: d?.[s.key] }) : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Part-to-whole over time — only the top segment gets the rounded data-end. */
export function StackedSeries({ data, xKey, series, height, yFormat, formatter, labelFormatter, tooltipExtra, onDrill }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} onClick={seriesClick(onDrill)} style={drillCursor(onDrill)}>
        {grid()}
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} tickFormatter={yFormat || formatCount} />
        {tip(formatter, labelFormatter, true, tooltipExtra)}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId="stack"
            fill={(s.color || seriesColor(s.key, i))}
            radius={i === series.length - 1 ? MARKS.barRadius : [0, 0, 0, 0]}
            maxBarSize={MARKS.barMaxSize}
            // 2px in the surface colour separates touching segments — the gap is
            // the mechanism, not a border drawn around the mark.
            stroke={SURFACE}
            strokeWidth={2}
            cursor={onDrill ? 'pointer' : undefined}
            onClick={onDrill ? (d) => onDrill({ label: d?.payload?.[xKey], seriesKey: s.key, value: d?.[s.key] }) : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

/**
 * Horizontal bars — the right form when category names are long or there are many.
 * A single series gets ONE colour (slot 1): colouring each bar by its own value
 * would double-encode length as hue.
 */
export function HorizontalBars({ data, nameKey, valueKey, height, formatter, colors, onDrill }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        {grid(true)}
        <XAxis type="number" {...axisProps} tickFormatter={formatCount} />
        <YAxis dataKey={nameKey} type="category" {...axisProps} width={132} />
        {tip(formatter, null, true)}
        <Bar
          dataKey={valueKey}
          radius={MARKS.barRadiusH}
          maxBarSize={MARKS.barMaxSize}
          cursor={onDrill ? 'pointer' : undefined}
          onClick={onDrill ? (d) => onDrill({ label: d?.payload?.[nameKey], value: d?.[valueKey], datum: d?.payload }) : undefined}
        >
          {data.map((row, i) => (
            <Cell key={i} fill={colors ? colors[i] : seriesColor(valueKey, 0)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Part-to-whole at a glance. Capped at 6 segments by the caller. */
export function DonutShare({ data, nameKey, valueKey, height, formatter, colors, centerLabel, centerValue, onDrill }) {
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={Math.round(height * 0.28)}
            outerRadius={Math.round(height * 0.42)}
            dataKey={valueKey}
            nameKey={nameKey}
            paddingAngle={2}
            stroke={SURFACE}
            strokeWidth={2}
            cursor={onDrill ? 'pointer' : undefined}
            onClick={onDrill ? (d) => onDrill({ label: d?.payload?.[nameKey] ?? d?.name, value: d?.value, datum: d?.payload }) : undefined}
          >
            {data.map((row, i) => (
              <Cell key={i} fill={colors ? colors[i] : seriesColor(row[nameKey], i)} />
            ))}
          </Pie>
          <Tooltip
            content={<ChartTooltip formatter={formatter} />}
            wrapperStyle={TOOLTIP_WRAPPER}
          />
        </PieChart>
      </ResponsiveContainer>
      {centerValue != null && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-xl font-bold" style={{ color: CHROME.textPrimary }}>
            {centerValue}
          </p>
          {centerLabel && (
            <p className="text-[10px]" style={{ color: CHROME.textMuted }}>
              {centerLabel}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

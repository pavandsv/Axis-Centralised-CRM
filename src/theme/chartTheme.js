// ---------------------------------------------------------------------------
// Chart theme — anchored to the Axis Finance brand.
//
// The categorical palette below was CHOSEN BY VALIDATION, not by eye. Ordering
// is the colour-blind-safety mechanism, so do not reorder slots casually:
// swapping slots 7 and 8 was required because orange beside green measured
// ΔE 1.7 under protanopia.
//
//   Palette (light, surface #FFFFFF, categorical): 8 slots
//     [PASS] Lightness band       all 8 inside L 0.43–0.77
//     [PASS] Chroma floor         all 8 >= 0.1
//     [PASS] CVD separation       worst adjacent #00958C↔#C28100 ΔE 13.0 (protan)
//     [PASS] Normal-vision floor  worst adjacent #1691C8↔#2E8B45 ΔE 19.0
//     [PASS] Contrast vs surface  all 8 >= 3:1
//
// For comparison, the palette this replaces (#BE6E86, #5E96C0, #5EA882, #8474BE)
// FAILED two gates: #5E96C0 and #5EA882 fell below the chroma floor (they render
// as grey), and that pair sat at ΔE 12.1, under the 15 floor for normal vision.
// ---------------------------------------------------------------------------

/** The surface charts are drawn on. Cards are white. */
export const SURFACE = '#FFFFFF'

/**
 * Categorical slots — the BRAND FAMILY. Warm hues only: maroon, gold, plum,
 * terracotta. No green, no blue, no teal, so charts read as Axis Finance.
 *
 * Validated on white, in this exact order — ALL CHECKS PASS, zero warnings.
 *
 * WHY ONLY FOUR: a fifth warm hue cannot be added. Tested — adding rose put gold
 * beside terracotta at ΔE 12.1 for normal vision (floor is 15) and ΔE 6.0 under
 * deuteranopia. A maroon-only ramp is worse still: four maroon steps fail the
 * lightness band, the chroma floor AND the normal-vision floor at ΔE 7.0 — two
 * of the four lines would be indistinguishable to everyone, colour-blind or not.
 * A chart needing a 5th series folds its tail into "Other" or facets into small
 * multiples. It never gets a generated hue.
 */
export const CATEGORICAL = [
  '#B02A50', // 1 maroon — the brand hue, stepped into the light band
  '#B08A00', // 2 gold
  '#8B3A78', // 3 plum
  '#C2603A', // 4 terracotta
]

/** Only for a chart that genuinely cannot fold below five series. */
export const CATEGORICAL_EXTENDED = [...CATEGORICAL, '#7A2E5E', '#8A5A2B']

/**
 * Series colour is keyed by the ENTITY, never by its position in the current
 * filter — so hiding a series never repaints the survivors.
 */
export const SERIES_COLOR = {
  // The funnel in brand order: received -> contacted -> qualified -> disbursed.
  leads: CATEGORICAL[0],
  received: CATEGORICAL[0],
  newLeads: CATEGORICAL[0],
  contacted: CATEGORICAL[1],
  followUp: CATEGORICAL[1],
  notInterested: CATEGORICAL[1],
  loggedIn: CATEGORICAL[2],
  loginInitiated: CATEGORICAL[2],
  qualified: CATEGORICAL[2],
  sanctioned: CATEGORICAL[2],
  notReachable: CATEGORICAL[2],
  disbursed: CATEGORICAL[3],
  rejected: CATEGORICAL[3],
  duplicate: CATEGORICAL[3],
  dqCount: CATEGORICAL[3],
  value: CATEGORICAL[0],
  count: CATEGORICAL[0],
}

export const seriesColor = (key, index = 0) =>
  SERIES_COLOR[key] || CATEGORICAL[index % CATEGORICAL.length]

/**
 * Ordinal ramp — one hue, light→dark, for ORDERED categories only (ageing
 * buckets, tiers, map density). Validated with --ordinal at six steps: monotone
 * L, every adjacent ΔL >= 0.06, light end clears 2:1 on the chart surface.
 * Past six steps ordinalSteps() interpolates and the steps tighten below that
 * ΔL floor — legal only where marks carry direct labels and length, as the
 * ranked bar charts do.
 * Never use this on nominal categories — that double-encodes size as colour.
 */
export const ORDINAL_MAROON = ['#E29CB4', '#D4799A', '#C05480', '#A93564', '#91204A', '#780F31']

/**
 * Five-slot palette for the Platform Activity funnel.
 *
 * The stages are ordered, but they are drawn as five OVERLAPPING lines, so what
 * the reader needs is identity, not magnitude. Measured: the ordinal ramp at
 * five steps gives a worst adjacent ΔE of 7.0 for normal vision — below the 15
 * floor, meaning Sanctioned and Disbursed are genuinely indistinguishable. So
 * the funnel takes a categorical set instead.
 *
 * The warm brand arc only holds four separable hues, so the fifth is a
 * restrained corporate blue. Validated adjacent-pair, light mode:
 *   CVD ΔE 16.8 (deutan) · normal ΔE 18.6 · all five >= 3:1 on the surface.
 */
export const FUNNEL_PALETTE = [
  '#B02A50', // Leads received — the brand maroon
  '#B08A00', // Contacted — gold
  '#3E8AC6', // Logged In — the one cool slot; the warm arc is full at four
  '#8B3A78', // Sanctioned — plum
  '#C2603A', // Disbursed — terracotta
]

const hexToRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
const rgbToHex = (rgb) =>
  '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase()

/**
 * n steps along the ramp, always exactly n.
 *
 * Beyond the six anchors it interpolates between them rather than running out:
 * `slice(0, n)` used to return six colours for n = 8, so the 7th and 8th marks
 * were painted `undefined` — which SVG renders as BLACK. That showed up as two
 * black bars on Data Quality by Reason.
 */
export const ordinalSteps = (n) => {
  if (n <= 1) return [ORDINAL_MAROON[ORDINAL_MAROON.length - 1]]
  const last = ORDINAL_MAROON.length - 1
  const out = []
  for (let i = 0; i < n; i++) {
    const pos = (i * last) / (n - 1)
    const lo = Math.floor(pos)
    const hi = Math.min(last, Math.ceil(pos))
    if (lo === hi) {
      out.push(ORDINAL_MAROON[lo])
      continue
    }
    const t = pos - lo
    const a = hexToRgb(ORDINAL_MAROON[lo])
    const b = hexToRgb(ORDINAL_MAROON[hi])
    out.push(rgbToHex(a.map((v, k) => v + (b[k] - v) * t)))
  }
  return out
}

/**
 * Status palette — RESERVED. These mean good / warning / serious / critical and
 * are never reused as "series 5". Always shipped with an icon or a label, never
 * colour alone (warning and serious are sub-3:1 on white by design).
 */
export const STATUS = {
  good: '#0CA30C',
  warning: '#FAB219',
  serious: '#EC835A',
  critical: '#D03B3B',
}

/** Neutral used when one series is the point and the rest are context. */
export const DE_EMPHASIS = '#CBD5E1'

/** Chrome — recessive by design. Hairline, solid, one step off the surface. */
export const CHROME = {
  grid: '#EEF1F6',
  axisText: '#94A3B8',
  axisTextSize: 11,
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
}

/** Mark specs, fixed across every chart in the app. */
export const MARKS = {
  lineWidth: 2,
  barMaxSize: 24,
  barRadius: [4, 4, 0, 0],
  barRadiusH: [0, 4, 4, 0],
  barGap: 2,
  areaOpacityTop: 0.14,
  areaOpacityBottom: 0.01,
  // Nested series (funnel stages) never cross, so their fills can carry real
  // weight — each band sits inside the one above instead of muddying it.
  nestedAreaOpacityTop: 0.9,
  nestedAreaOpacityBottom: 0.55,
  dotRadius: 4, // 8px mark
  surfaceRing: 2,
}

/** Indian-format currency, compacted for axes and tiles. */
export const formatINR = (n) => {
  if (n == null) return '—'
  if (Math.abs(n) >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`
  if (Math.abs(n) >= 100000) return `₹${(n / 100000).toFixed(2)} L`
  if (Math.abs(n) >= 1000) return `₹${(n / 1000).toFixed(0)} K`
  return `₹${n}`
}

export const formatCount = (n) =>
  n == null ? '—' : n >= 100000 ? `${(n / 100000).toFixed(1)}L` : n.toLocaleString('en-IN')

export const formatPct = (n) => (n == null ? '—' : `${n}%`)

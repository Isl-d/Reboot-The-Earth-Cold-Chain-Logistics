import { AXIS_LINE, AXIS_STYLE, CHART_COLORS } from '../../design'

// QAI chart frame shared by the truck charts: 2px ink axis lines, mono bold
// ticks, flat solid grid. Colours are CSS variables, so both themes follow.

export const X_AXIS = {
  tick: AXIS_STYLE,
  tickLine: false,
  axisLine: AXIS_LINE,
  interval: 'preserveStartEnd' as const,
  minTickGap: 36,
  tickMargin: 6,
}

export const Y_AXIS = {
  tick: AXIS_STYLE,
  tickLine: false,
  axisLine: AXIS_LINE,
  tickMargin: 4,
}

export const GRID = { stroke: CHART_COLORS.grid, vertical: false }

export const MARGIN = { top: 14, right: 18, left: 2, bottom: 4 }

/** Mono bold label for a reference line. */
export function refLabel(value: string, fill: string, position: 'insideTopRight' | 'insideBottomRight' | 'insideBottomLeft' = 'insideTopRight') {
  return { value, position, fill, fontSize: 10, fontWeight: 700, fontFamily: 'var(--font-mono)' }
}

export const RISK = {
  low: 'var(--color-risk-low)',
  high: 'var(--color-risk-high)',
  critical: 'var(--color-risk-critical)',
}

export const tint = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`

export function clock(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

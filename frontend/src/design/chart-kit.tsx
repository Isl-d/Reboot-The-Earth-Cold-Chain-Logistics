import type { ComponentProps, ReactNode } from 'react'
import { ReferenceArea, ReferenceLine, Tooltip } from 'recharts'

// Shared Recharts styling so every chart in the app looks like one system.
// Every colour is a CSS variable (DESIGN.md tokens in index.css), so charts
// follow the dark/light theme with the rest of the app. Series hues were
// checked with the dataviz skill's palette validator on both surfaces.

export const CHART_COLORS = {
  grid: 'var(--color-border)',
  axis: 'var(--color-text-secondary)',
  measured: 'var(--color-provenance-measured-dot)',
  calculated: 'var(--color-provenance-calculated-dot)',
  predicted: 'var(--color-provenance-predicted-dot)',
  safeLine: 'var(--color-risk-low)',
  excursion: 'var(--color-risk-critical)',
  excursionFill: 'color-mix(in srgb, var(--color-risk-critical) 12%, transparent)',
}

export const AXIS_STYLE = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  fill: CHART_COLORS.axis,
}

// Crosshair tooltip content — DESIGN.md tooltip: elevated tone, 2px radius.
export function ChartTooltip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-sm border border-line bg-elevated px-3 py-2 text-body-sm text-navy">
      {children}
    </div>
  )
}

export function CrosshairTooltip(props: ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip
      cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }}
      contentStyle={{
        background: 'var(--color-elevated)',
        border: '1px solid var(--color-border)',
        borderRadius: 2,
        fontFamily: 'var(--font-sans)',
        fontSize: 12,
        color: 'var(--color-text-primary)',
      }}
      labelStyle={{ color: 'var(--color-text-secondary)' }}
      itemStyle={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}
      {...props}
    />
  )
}

// A safe-limit reference line — e.g. the 4°C threshold in the spec's thermal-exposure example.
export function SafeLimitLine({ y, label }: { y: number; label?: string }) {
  return (
    <ReferenceLine
      y={y}
      stroke={CHART_COLORS.safeLine}
      strokeDasharray="4 4"
      label={label ? { value: label, position: 'insideTopLeft', fill: CHART_COLORS.safeLine, fontSize: 11 } : undefined}
    />
  )
}

// A shaded band marking a temperature excursion window — plan.md "Approved extras" #2.
export function ExcursionBand({ x1, x2 }: { x1: number | string; x2: number | string }) {
  return <ReferenceArea x1={x1} x2={x2} fill={CHART_COLORS.excursionFill} stroke={CHART_COLORS.excursion} strokeOpacity={0.3} />
}

export interface ExcursionRange {
  x1: number
  x2: number
}

interface TimedTemperatureSample {
  timestampMs: number
  temperatureC: number
}

/**
 * Contiguous ranges where temperature exceeds the safe threshold, for
 * ExcursionBand — shared by every screen that charts temperature over time
 * (Simulation, Mathematical Model) instead of each reimplementing it.
 */
export function computeExcursionBands<T extends TimedTemperatureSample>(
  samples: T[],
  safeTemperatureC: number,
): ExcursionRange[] {
  const bands: ExcursionRange[] = []
  let start: number | null = null
  for (const sample of samples) {
    const above = sample.temperatureC > safeTemperatureC
    if (above && start === null) start = sample.timestampMs
    if (!above && start !== null) {
      bands.push({ x1: start, x2: sample.timestampMs })
      start = null
    }
  }
  if (start !== null && samples.length > 0) {
    bands.push({ x1: start, x2: samples[samples.length - 1].timestampMs })
  }
  return bands
}

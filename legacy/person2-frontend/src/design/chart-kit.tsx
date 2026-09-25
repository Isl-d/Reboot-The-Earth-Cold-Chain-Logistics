import type { ComponentProps, ReactNode } from 'react'
import { ReferenceArea, ReferenceLine, Tooltip } from 'recharts'

// Shared Recharts styling so every chart in the app looks like one system.
// Colors are DESIGN.md tokens; nothing here is chart-library defaults.

export const CHART_COLORS = {
  grid: '#E2E8F0',
  axis: '#64748B',
  measured: '#4F46E5',
  calculated: '#7C3AED',
  predicted: '#0284C7',
  safeLine: '#10B981',
  excursion: '#EF4444',
  excursionFill: 'rgba(239, 68, 68, 0.08)',
}

export const AXIS_STYLE = {
  fontFamily: '"JetBrains Mono", monospace',
  fontSize: 11,
  fill: CHART_COLORS.axis,
}

// Crosshair tooltip content — DESIGN.md-styled container, caller supplies rows.
export function ChartTooltip({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-line-strong bg-surface px-3 py-2 text-body-sm shadow-level2">
      {children}
    </div>
  )
}

export function CrosshairTooltip(props: ComponentProps<typeof Tooltip>) {
  return (
    <Tooltip
      cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }}
      contentStyle={{
        border: '1px solid #CBD5E1',
        borderRadius: 6,
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
        boxShadow: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -2px rgba(15, 23, 42, 0.03)',
      }}
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

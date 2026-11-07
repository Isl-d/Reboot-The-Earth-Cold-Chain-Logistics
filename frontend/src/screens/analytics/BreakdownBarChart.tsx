import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { FoodLossBreakdownItem } from '@/api/types'
import { AXIS_LINE, AXIS_STYLE, CHART_COLORS, CrosshairTooltip } from '@/design'
import ChartEmpty from './ChartEmpty'

interface BreakdownBarChartProps {
  data: FoodLossBreakdownItem[]
  /** Flat bar fill, e.g. var(--color-fill-coral). */
  color: string
  height?: number
  emptyMessage?: string
}

// Sorted horizontal QAI bars for the loss breakdowns: flat fill, 2px ink
// outline, 2px ink axes, mono value at the bar end.
export default function BreakdownBarChart({ data, color, height, emptyMessage = 'No data yet.' }: BreakdownBarChartProps) {
  const sorted = [...data].sort((a, b) => b.lostKg - a.lostKg)
  const chartHeight = height ?? Math.max(160, sorted.length * 38 + 24)
  if (sorted.length === 0) return <ChartEmpty height={chartHeight} message={emptyMessage} />
  // Size the label column to the longest label (≈7px per char at 11px mono)
  // instead of a fixed width that leaves a gap in these narrow thirds.
  const labelWidth = Math.min(120, Math.max(56, Math.max(...sorted.map((d) => d.label.length)) * 7 + 8))
  const maxChars = Math.floor((labelWidth - 8) / 7)
  const shortLabel = (label: string) => {
    const text = label.replace(/_/g, ' ').toLowerCase()
    return text.length > maxChars ? `${text.slice(0, maxChars - 1)}…` : text
  }
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }} barCategoryGap="22%">
        <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" horizontal={false} />
        <XAxis type="number" tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={AXIS_STYLE}
          tickFormatter={shortLabel}
          axisLine={AXIS_LINE}
          tickLine={false}
          width={labelWidth}
        />
        <CrosshairTooltip cursor={{ fill: 'var(--color-elevated)' }} formatter={(value) => [`${value} kg`, 'Lost']} />
        <Bar
          dataKey="lostKg"
          fill={color}
          stroke={CHART_COLORS.ink}
          strokeWidth={2}
          radius={[0, 4, 4, 0]}
          animationDuration={700}
        >
          <LabelList dataKey="lostKg" position="right" style={{ ...AXIS_STYLE, fill: 'var(--color-text-primary)' }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

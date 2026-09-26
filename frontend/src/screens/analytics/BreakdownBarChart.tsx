import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { FoodLossBreakdownItem } from '@/api/types'
import { AXIS_STYLE, CHART_COLORS, CrosshairTooltip } from '@/design'
import ChartEmpty from './ChartEmpty'

interface BreakdownBarChartProps {
  data: FoodLossBreakdownItem[]
  color: string
  height?: number
  emptyMessage?: string
}

// Sorted horizontal bars — plan.md "Decisions" → Breakdown charts.
export default function BreakdownBarChart({ data, color, height, emptyMessage = 'No data yet.' }: BreakdownBarChartProps) {
  const sorted = [...data].sort((a, b) => b.lostKg - a.lostKg)
  const chartHeight = height ?? Math.max(160, sorted.length * 36)
  if (sorted.length === 0) return <ChartEmpty height={chartHeight} message={emptyMessage} />
  // Size the label column to the longest label (≈7px per char at 12px mono)
  // instead of a fixed 172px that leaves a gap in these narrow thirds.
  const labelWidth = Math.min(140, Math.max(56, Math.max(...sorted.map((d) => d.label.length)) * 7 + 8))
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit=" kg" />
        <YAxis type="category" dataKey="label" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} width={labelWidth} />
        <CrosshairTooltip formatter={(value) => [`${value} kg`, 'Lost']} />
        <Bar dataKey="lostKg" fill={color} radius={[0, 3, 3, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

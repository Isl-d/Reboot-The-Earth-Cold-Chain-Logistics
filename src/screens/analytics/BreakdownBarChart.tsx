import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import type { FoodLossBreakdownItem } from '@/api/types'
import { AXIS_STYLE, CHART_COLORS, CrosshairTooltip } from '@/design'

interface BreakdownBarChartProps {
  data: FoodLossBreakdownItem[]
  color: string
  height?: number
}

// Sorted horizontal bars — plan.md "Decisions" → Breakdown charts.
export default function BreakdownBarChart({ data, color, height }: BreakdownBarChartProps) {
  const sorted = [...data].sort((a, b) => b.lostKg - a.lostKg)
  return (
    <ResponsiveContainer width="100%" height={height ?? Math.max(120, sorted.length * 36)}>
      <BarChart data={sorted} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
        <XAxis type="number" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit=" kg" />
        <YAxis type="category" dataKey="label" tick={AXIS_STYLE} stroke={CHART_COLORS.grid} width={140} />
        <CrosshairTooltip formatter={(value) => [`${value} kg`, 'Lost']} />
        <Bar dataKey="lostKg" fill={color} radius={[0, 3, 3, 0]} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  )
}

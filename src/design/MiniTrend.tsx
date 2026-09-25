import { Line, LineChart, ResponsiveContainer } from 'recharts'
import type { StatusTier } from './types'

// A compact sparkline for KpiCard / TelemetryValueCard, per DESIGN.md's
// "micro trend sparkline" spec. Deliberately axis-less and non-interactive —
// it signals direction, not exact values.
const STROKE: Record<StatusTier, string> = {
  safe: '#10B981',
  warning: '#F59E0B',
  critical: '#EF4444',
  offline: '#64748B',
}

interface MiniTrendProps {
  data: number[]
  tier?: StatusTier
  height?: number
}

export default function MiniTrend({ data, tier = 'offline', height = 32 }: MiniTrendProps) {
  const points = data.map((value, index) => ({ index, value }))
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={STROKE[tier]}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

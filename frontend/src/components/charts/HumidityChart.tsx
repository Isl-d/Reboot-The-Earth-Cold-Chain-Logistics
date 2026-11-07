import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, CrosshairTooltip } from '../../design'
import type { TelemetryPoint } from '../../types'
import { clock, GRID, MARGIN, X_AXIS, Y_AXIS } from './style'

// Measured relative humidity: a 2px sky stroke over a flat sky fill.
export function HumidityChart({ data, fill }: { data: TelemetryPoint[]; fill?: boolean }) {
  const chartData = data.map((p) => ({ time: clock(p.timestamp), humidity: p.humidityPct }))
  return (
    <ResponsiveContainer width="100%" height={fill ? '100%' : 200}>
      <AreaChart data={chartData} margin={MARGIN}>
        <CartesianGrid {...GRID} />
        <XAxis dataKey="time" {...X_AXIS} />
        <YAxis {...Y_AXIS} unit="%" domain={[40, 100]} width={42} />
        <CrosshairTooltip formatter={(v) => [`${Number(v)}%`, 'Humidity']} />
        <Area
          type="monotone"
          dataKey="humidity"
          stroke={CHART_COLORS.measured}
          strokeWidth={2}
          fill={CHART_COLORS.measured}
          fillOpacity={0.16}
          dot={false}
          activeDot={{ r: 5, fill: CHART_COLORS.measured, stroke: CHART_COLORS.ink, strokeWidth: 2 }}
          isAnimationActive
          animationDuration={900}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

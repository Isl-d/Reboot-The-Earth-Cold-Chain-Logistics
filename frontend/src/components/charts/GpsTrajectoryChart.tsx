import type { ScatterPointItem } from 'recharts/types/cartesian/Scatter'
import { ResponsiveContainer, Scatter, ScatterChart, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, CrosshairTooltip } from '../../design'
import type { TelemetryPoint } from '../../types'
import { X_AXIS, Y_AXIS } from './style'

interface ChartPoint {
  lon: number
  lat: number
  idx: number
}

// Trail in measured sky, fading in from the oldest fix; the live position is
// a larger ink-ringed dot (red would read as CRITICAL).
function TruckDot(props: ScatterPointItem & { payload?: ChartPoint; totalPoints?: number }) {
  const { cx = 0, cy = 0, payload, totalPoints = 1 } = props
  const idx = payload?.idx ?? 0
  const isLast = idx === totalPoints - 1
  if (isLast) {
    return (
      <g>
        <circle cx={cx} cy={cy} r={8} fill={CHART_COLORS.measured} fillOpacity={0.3} />
        <circle cx={cx} cy={cy} r={5} fill={CHART_COLORS.measured} stroke={CHART_COLORS.ink} strokeWidth={2} />
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={2.5} fill={CHART_COLORS.measured} opacity={0.35 + (idx / totalPoints) * 0.65} />
}

export function GpsTrajectoryChart({ data, fill }: { data: TelemetryPoint[]; fill?: boolean }) {
  const chartData: ChartPoint[] = data.map((p, i) => ({
    lon: parseFloat(p.longitude.toFixed(4)),
    lat: parseFloat(p.latitude.toFixed(4)),
    idx: i,
  }))

  return (
    <ResponsiveContainer width="100%" height={fill ? '100%' : 200}>
      <ScatterChart margin={{ top: 14, right: 18, left: 2, bottom: 4 }}>
        <XAxis
          dataKey="lon"
          type="number"
          name="Lon"
          domain={['auto', 'auto']}
          {...X_AXIS}
          interval={0}
          tickCount={4}
          tickFormatter={(v: number) => v.toFixed(2)}
        />
        <YAxis
          dataKey="lat"
          type="number"
          name="Lat"
          domain={['auto', 'auto']}
          {...Y_AXIS}
          tickCount={4}
          tickFormatter={(v: number) => v.toFixed(2)}
          width={46}
        />
        <CrosshairTooltip formatter={(v, name) => [Number(v).toFixed(4), String(name)]} />
        <Scatter
          data={chartData}
          fill={CHART_COLORS.measured}
          isAnimationActive={false}
          shape={(props: unknown) => (
            <TruckDot {...(props as ScatterPointItem & { payload?: ChartPoint })} totalPoints={chartData.length} />
          )}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

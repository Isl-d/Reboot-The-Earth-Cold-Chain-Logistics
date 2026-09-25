import type { ScatterPointItem } from 'recharts/types/cartesian/Scatter'
import { ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { TelemetryPoint } from '../../types'

interface ChartPoint {
  lon: number
  lat: number
  idx: number
}

function TruckDot(props: ScatterPointItem & { idx?: number; payload?: ChartPoint; totalPoints?: number }) {
  const { cx = 0, cy = 0, payload, totalPoints = 1 } = props
  const idx = payload?.idx ?? 0
  const isLast = idx === totalPoints - 1
  return (
    <circle
      cx={cx}
      cy={cy}
      r={isLast ? 5 : 2.5}
      // Trail in neutral ink, live position in Signal Cyan (red would read as CRITICAL).
      fill={isLast ? 'var(--color-primary)' : 'var(--color-text-secondary)'}
      opacity={isLast ? 1 : 0.5 + (idx / totalPoints) * 0.5}
    />
  )
}

export function GpsTrajectoryChart({ data, fill }: { data: TelemetryPoint[]; fill?: boolean }) {
  const chartData: ChartPoint[] = data.map((p, i) => ({
    lon: parseFloat(p.longitude.toFixed(4)),
    lat: parseFloat(p.latitude.toFixed(4)),
    idx: i,
  }))

  return (
    <ResponsiveContainer width="100%" height={fill ? '100%' : 180}>
      <ScatterChart margin={{ top: 8, right: 24, left: 4, bottom: 12 }}>
        <XAxis
          dataKey="lon"
          type="number"
          name="Longitude"
          domain={['auto', 'auto']}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={{ stroke: 'var(--color-border)' }}
          tickFormatter={(v: number) => v.toFixed(3)}
          label={{ value: 'LON', fill: 'var(--color-text-secondary)', fontSize: 9, position: 'insideBottomRight', offset: -4 }}
        />
        <YAxis
          dataKey="lat"
          type="number"
          name="Latitude"
          domain={['auto', 'auto']}
          tick={{ fill: 'var(--color-text-secondary)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => v.toFixed(3)}
          width={60}
          label={{ value: 'LAT', fill: 'var(--color-text-secondary)', fontSize: 9, angle: -90, position: 'insideLeft' }}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--color-elevated)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-primary)',
          }}
          cursor={{ stroke: 'var(--color-border)' }}
          formatter={(v) => [Number(v).toFixed(4), '']}
        />
        <Scatter
          data={chartData}
          fill="var(--color-text-secondary)"
          opacity={0.7}
          shape={(props) => (
            <TruckDot
              {...(props as ScatterPointItem & { payload?: ChartPoint })}
              totalPoints={chartData.length}
            />
          )}
        />
      </ScatterChart>
    </ResponsiveContainer>
  )
}

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, CrosshairTooltip } from '../../design'
import type { TelemetryPoint } from '../../types'
import { clock, GRID, MARGIN, RISK, X_AXIS, Y_AXIS } from './style'

// How far each measured reading sits above the batch's safe max (0 when inside
// the band). This is a per-reading display of measured data only: the official
// thermal exposure E_T is computed by the backend (features.py) and is shown
// next to this chart, never re-derived here.
export function ThermalExposureChart({ data, safeMaxTempC = 4, fill }: { data: TelemetryPoint[]; safeMaxTempC?: number; fill?: boolean }) {
  const chartData = data.map((p) => ({
    time: clock(p.timestamp),
    over: Math.max(0, p.temperatureC - safeMaxTempC),
  }))
  const anyOver = chartData.some((d) => d.over > 0)

  return (
    <div className="relative h-full w-full">
      <ResponsiveContainer width="100%" height={fill ? '100%' : 200}>
        <AreaChart data={chartData} margin={MARGIN}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="time" {...X_AXIS} />
          <YAxis {...Y_AXIS} unit="°C" width={46} domain={[0, (max: number) => Math.max(1, Math.ceil(max))]} />
          <CrosshairTooltip formatter={(v) => [`+${Number(v).toFixed(1)}°C`, 'Above safe max']} />
          <Area
            type="stepAfter"
            dataKey="over"
            stroke={RISK.high}
            strokeWidth={2}
            fill={RISK.high}
            fillOpacity={0.22}
            dot={false}
            activeDot={{ r: 5, fill: RISK.high, stroke: CHART_COLORS.ink, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={900}
          />
        </AreaChart>
      </ResponsiveContainer>
      {!anyOver && data.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center pb-6">
          <span className="tt-chip bg-fill-lime text-on-fill">No reading above {safeMaxTempC}°C</span>
        </div>
      )}
    </div>
  )
}

import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { CHART_COLORS, CrosshairTooltip } from '../../design'
import type { TelemetryPoint } from '../../types'
import { clock, GRID, MARGIN, refLabel, RISK, tint, X_AXIS, Y_AXIS } from './style'

interface Props {
  data: TelemetryPoint[]
  safeMinTempC?: number
  safeMaxTempC?: number
  fill?: boolean
}

// Measured temperature (sky) inside the batch's safe band (faint lime), with
// the safe max as a dashed red rule. The band always stays in view.
export function TemperatureChart({ data, safeMinTempC = 0, safeMaxTempC = 4, fill }: Props) {
  const chartData = data.map((p) => ({ time: clock(p.timestamp), temp: p.temperatureC }))
  return (
    <ResponsiveContainer width="100%" height={fill ? '100%' : 200}>
      <LineChart data={chartData} margin={MARGIN}>
        <CartesianGrid {...GRID} />
        <ReferenceArea y1={safeMinTempC} y2={safeMaxTempC} fill={tint(RISK.low, 12)} strokeOpacity={0} ifOverflow="extendDomain" />
        <XAxis dataKey="time" {...X_AXIS} />
        <YAxis {...Y_AXIS} unit="°C" width={46} domain={['auto', 'auto']} />
        <ReferenceLine
          y={safeMaxTempC}
          stroke={RISK.critical}
          strokeDasharray="6 4"
          strokeWidth={2}
          ifOverflow="extendDomain"
          label={refLabel(`MAX ${safeMaxTempC}°C`, RISK.critical, 'insideBottomRight')}
        />
        <ReferenceLine
          y={safeMinTempC}
          stroke={RISK.low}
          strokeDasharray="6 4"
          strokeWidth={2}
          ifOverflow="extendDomain"
          label={refLabel(`MIN ${safeMinTempC}°C`, RISK.low, 'insideBottomLeft')}
        />
        <CrosshairTooltip formatter={(v) => [`${Number(v).toFixed(1)}°C`, 'Temperature']} />
        <Line
          type="monotone"
          dataKey="temp"
          stroke={CHART_COLORS.measured}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 5, fill: CHART_COLORS.measured, stroke: CHART_COLORS.ink, strokeWidth: 2 }}
          isAnimationActive
          animationDuration={900}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

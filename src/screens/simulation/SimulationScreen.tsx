import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import {
  useResetSimulation,
  useSimTruckOptions,
  useSimulationState,
  useStartSimulation,
  useStopSimulation,
  useThermalExposure,
  useTruckTelemetry,
} from '@/api/hooks'
import type { ScenarioId } from '@/api/types'
import {
  AXIS_STYLE,
  Button,
  Card,
  CHART_COLORS,
  computeExcursionBands,
  CrosshairTooltip,
  ExcursionBand,
  ProvenanceBadge,
  SafeLimitLine,
  Select,
  StatusChip,
} from '@/design'
import { formatClockTime, formatDuration } from './formatters'
import ScenarioPicker from './ScenarioPicker'

const SPEED_OPTIONS = [
  { value: '1', label: '1x (real time)' },
  { value: '5', label: '5x' },
  { value: '10', label: '10x' },
  { value: '30', label: '30x' },
  { value: '60', label: '60x' },
]

export default function SimulationScreen() {
  const trucksQuery = useSimTruckOptions()
  const [truckId, setTruckId] = useState('')
  const [scenario, setScenario] = useState<ScenarioId>('NORMAL')
  const [speedMultiplier, setSpeedMultiplier] = useState(10)

  useEffect(() => {
    if (!truckId && trucksQuery.data && trucksQuery.data.length > 0) {
      setTruckId(trucksQuery.data[0].truckId)
    }
  }, [trucksQuery.data, truckId])

  const selectedTruck = trucksQuery.data?.find((t) => t.truckId === truckId)

  const simState = useSimulationState(truckId)
  const running = simState.data?.running ?? false

  // Fetched once per truck (not polled) — only used for the chart's safe-limit
  // reference line, so it doesn't need the continuous polling the Model
  // screen will use for the full thermal-exposure chain.
  const thermalExposure = useThermalExposure(truckId, false)
  const telemetry = useTruckTelemetry(truckId, running)

  const startSimulation = useStartSimulation()
  const stopSimulation = useStopSimulation()
  const resetSimulation = useResetSimulation()

  const samples = telemetry.data ?? []
  const safeTemperatureC = thermalExposure.data?.safeTemperatureC
  const excursionBands = useMemo(
    () => (safeTemperatureC !== undefined ? computeExcursionBands(samples, safeTemperatureC) : []),
    [samples, safeTemperatureC],
  )

  const firstSample = samples[0]
  const lastSample = samples[samples.length - 1]
  const elapsedMs = firstSample && lastSample ? lastSample.timestampMs - firstSample.timestampMs : 0

  const canStart = Boolean(truckId) && !running
  const canStop = Boolean(truckId) && running
  const canReset = Boolean(truckId)

  return (
    <>
      {/* Controls */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-4 p-4">
        <h2 className="text-headline-sm text-navy">Controls</h2>

        <label className="mt-4 block text-label-ui uppercase text-muted">Truck</label>
        <Select
          className="mt-1"
          value={truckId}
          disabled={running}
          onChange={(e) => setTruckId(e.target.value)}
          options={
            trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]
          }
        />
        {selectedTruck && (
          <p className="mt-1 text-body-sm text-muted">
            {selectedTruck.batchId} — {selectedTruck.product} ({selectedTruck.quantityKg} kg)
          </p>
        )}

        <label className="mt-4 block text-label-ui uppercase text-muted">Scenario</label>
        <div className="mt-1">
          <ScenarioPicker value={scenario} onChange={setScenario} disabled={running} />
        </div>

        <label className="mt-4 block text-label-ui uppercase text-muted">Simulation speed</label>
        <Select
          className="mt-1"
          value={String(speedMultiplier)}
          disabled={running}
          onChange={(e) => setSpeedMultiplier(Number(e.target.value))}
          options={SPEED_OPTIONS}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={!canStart}
            onClick={() => startSimulation.mutate({ truckId, scenario, speedMultiplier })}
          >
            Start
          </Button>
          <Button variant="secondary" disabled={!canStop} onClick={() => stopSimulation.mutate(truckId)}>
            Stop
          </Button>
          <Button variant="destructive" disabled={!canReset} onClick={() => resetSimulation.mutate(truckId)}>
            Reset
          </Button>
        </div>
      </Card>

      {/* Live sensors */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-8 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">Live Sensors</h2>
          <ProvenanceBadge kind="measured" />
        </div>

        {samples.length === 0 ? (
          <div className="flex h-64 items-center justify-center text-body-sm text-muted">
            Start a simulation to see live sensor data.
          </div>
        ) : (
          <>
            <p className="mt-3 text-label-ui uppercase text-muted">Temperature</p>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={samples} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="timestampMs"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ms) => formatClockTime(ms)}
                  tick={AXIS_STYLE}
                  stroke={CHART_COLORS.grid}
                />
                <YAxis tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit="°C" width={48} />
                {excursionBands.map((band, i) => (
                  <ExcursionBand key={i} x1={band.x1} x2={band.x2} />
                ))}
                {safeTemperatureC !== undefined && <SafeLimitLine y={safeTemperatureC} label="Safe limit" />}
                <CrosshairTooltip
                  labelFormatter={(ms) => formatClockTime(Number(ms))}
                  formatter={(value) => [`${Number(value).toFixed(1)}°C`, 'Temperature']}
                />
                <Area
                  type="monotone"
                  dataKey="temperatureC"
                  stroke={CHART_COLORS.measured}
                  fill={CHART_COLORS.measured}
                  fillOpacity={0.12}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            <p className="mt-2 text-label-ui uppercase text-muted">Humidity</p>
            <ResponsiveContainer width="100%" height={120}>
              <LineChart data={samples} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="timestampMs"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ms) => formatClockTime(ms)}
                  tick={AXIS_STYLE}
                  stroke={CHART_COLORS.grid}
                />
                <YAxis tick={AXIS_STYLE} stroke={CHART_COLORS.grid} unit="%" width={48} />
                <CrosshairTooltip
                  labelFormatter={(ms) => formatClockTime(Number(ms))}
                  formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Humidity']}
                />
                <Line
                  type="monotone"
                  dataKey="humidityPercent"
                  stroke={CHART_COLORS.predicted}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>

            {lastSample && (
              <p className="mt-2 text-body-sm text-muted">
                Door: <span className="text-navy">{lastSample.doorOpen ? 'Open' : 'Closed'}</span>
              </p>
            )}
          </>
        )}
      </Card>

      {/* Timeline */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <StatusChip tier={running ? 'safe' : 'offline'} label={running ? 'Running' : 'Stopped'} />
          <span className="text-body-sm text-navy">
            {selectedTruck?.label ?? '—'} · {scenario.replace(/_/g, ' ')}
          </span>
          <span className="font-mono text-body-sm tabular-nums text-muted">Elapsed {formatDuration(elapsedMs)}</span>
          <span className="text-body-sm text-muted">{samples.length} samples received</span>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-canvas">
          <div className={running ? 'h-full w-1/3 animate-indeterminate bg-sky' : 'h-full w-0'} />
        </div>
      </Card>
    </>
  )
}

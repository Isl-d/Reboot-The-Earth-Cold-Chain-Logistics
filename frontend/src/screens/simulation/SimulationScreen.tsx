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
  useDeterioration,
  useResetSimulation,
  useSimTruckOptions,
  useSimulationState,
  useSpoilagePrediction,
  useStartSimulation,
  useStopSimulation,
  useSystem1,
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
  InfoTip,
  KpiCard,
  ProvenanceBadge,
  SafeLimitLine,
  ScenarioPicker,
  Select,
  StatusChip,
} from '@/design'
import { formatClockTime, formatDuration } from '@/lib/datetime'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'

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

  // The whole derived chain is polled while running, so this screen shows the
  // same numbers as the Model page: exposure, deterioration, spoilage and Laya.
  const thermalExposure = useThermalExposure(truckId, running)
  const deterioration = useDeterioration(truckId, running)
  const spoilage = useSpoilagePrediction(truckId, running)
  const system1 = useSystem1(truckId, running)
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

      {/* Derived intelligence — the same chain the Model page shows */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            Derived intelligence
            <InfoTip title="Derived intelligence">
              Everything here is computed from the sensor readings by the deterministic
              engine, so it agrees with the Model, Optimization and Truck pages.
            </InfoTip>
          </h2>
          <ProvenanceBadge kind="calculated" />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          <KpiCard
            label="Thermal exposure"
            value={thermalExposure.data ? thermalExposure.data.thermalExposure.toFixed(1) : '—'}
            unit="°C·min"
            provenance="calculated"
            compactProvenance
            tip="E_T = Σ max(0, T − T_safe)·Δt: the degrees above the safe maximum, integrated over time."
          />
          <KpiCard
            label="Deterioration"
            value={deterioration.data ? (deterioration.data.deteriorationFraction * 100).toFixed(1) : '—'}
            unit="%"
            provenance="calculated"
            compactProvenance
            tip="Fraction of shelf life consumed, from an Arrhenius rate that rises with temperature (configured per product)."
          />
          <KpiCard
            label="Shelf life left"
            value={deterioration.data ? deterioration.data.remainingShelfLifeHours.toFixed(0) : '—'}
            unit="h"
            provenance="calculated"
            compactProvenance
            tip="Initial shelf life × (1 − deterioration): whether the load will still be acceptable on arrival."
          />
          <KpiCard
            label="Spoilage"
            value={spoilage.data ? (spoilage.data.spoilageProbability * 100).toFixed(1) : '—'}
            unit="%"
            provenance="predicted"
            compactProvenance
            tip="Estimated probability the batch is spoiled, from a saturating exposure–response prior."
          />
          <KpiCard
            label="Humidity"
            value={lastSample ? lastSample.humidityPercent.toFixed(0) : '—'}
            unit="%"
            provenance="measured"
            compactProvenance
            tip="Relative humidity from the sensor. With temperature it drives condensation risk."
          />
          <Card className="p-4">
            <span className="text-body-sm text-muted">Risk</span>
            <div className="mt-2">
              {spoilage.data ? (
                <StatusChip
                  tier={riskTierFromProbability(spoilage.data.spoilageProbability)}
                  label={riskLabelFromProbability(spoilage.data.spoilageProbability)}
                />
              ) : (
                <span className="text-body-sm text-muted">—</span>
              )}
            </div>
          </Card>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-line pt-3 text-body-sm">
          <span className="flex items-center gap-1.5 text-label-ui uppercase text-muted">
            Laya · System 1
            <InfoTip title="Laya (System 1)">
              A local, non-autoregressive decision model (Apache-2.0). It classifies the
              condition and cause from the facts and corroborates the engine — it never
              overrides it, and it never generates free text, so it cannot invent numbers.
            </InfoTip>
          </span>
          {system1.data?.available ? (
            <>
              <StatusChip
                tier={system1.data.condition === 'normal' ? 'safe' : 'warning'}
                label={`Condition: ${system1.data.condition ?? '—'}`}
              />
              <StatusChip tier="offline" label={`Cause: ${system1.data.cause ?? '—'}`} />
              <StatusChip
                tier={system1.data.agreesWithDecision ? 'safe' : 'warning'}
                label={system1.data.agreesWithDecision ? 'Agrees with engine' : `Suggests ${system1.data.action ?? '—'}`}
              />
              <span className="text-muted">{system1.data.model ?? 'laya'} · confidence uncalibrated</span>
            </>
          ) : (
            <span className="text-muted">Laya unavailable (start the laya service).</span>
          )}
        </div>
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

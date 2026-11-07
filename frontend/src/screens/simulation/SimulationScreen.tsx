import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, XAxis, YAxis } from 'recharts'
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
  AXIS_LINE,
  AXIS_STYLE,
  Box,
  Button,
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
  Steps,
  type StatusTier,
  type StepItem,
  type StepState,
} from '@/design'
import { clsx, FOCUS_RING } from '@/design/clsx'
import { formatClockTime, formatDuration } from '@/lib/datetime'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'

const SPEED_OPTIONS = [1, 5, 10, 30, 60]

// Risk tile fill by tier: lime low, gold medium, coral high.
const RISK_FILL: Record<StatusTier, string> = {
  safe: 'bg-fill-lime text-on-fill',
  warning: 'bg-fill-sun text-on-fill',
  critical: 'bg-fill-coral text-on-fill',
  offline: 'bg-surface text-text-primary',
}

const FIELD_LABEL = 'tt-caps mb-1.5 block text-text-secondary'

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

  const riskTier = spoilage.data ? riskTierFromProbability(spoilage.data.spoilageProbability) : 'offline'

  // Stage progress for the pipeline: a stage is done once the backend has
  // returned its value, running while the simulation waits for it.
  const stage = (has: boolean): StepState => (has ? 'done' : running ? 'run' : 'idle')
  const laya = system1.data
  const pipeline: StepItem[] = [
    {
      label: 'Sensor data',
      detail: 'MQTT ingest · temperature, humidity, door',
      state: stage(samples.length > 0),
      tag: samples.length > 0 ? `${samples.length} samples` : undefined,
    },
    {
      label: 'Thermal exposure',
      detail: 'degrees above safe max, over time',
      state: stage(Boolean(thermalExposure.data)),
      tag: thermalExposure.data ? `${thermalExposure.data.thermalExposure.toFixed(1)} °C·min` : undefined,
    },
    {
      label: 'Deterioration',
      detail: 'Arrhenius rate · shelf life used',
      state: stage(Boolean(deterioration.data)),
      tag: deterioration.data ? `${(deterioration.data.deteriorationFraction * 100).toFixed(1)}%` : undefined,
    },
    {
      label: 'Spoilage prediction',
      detail: 'exposure-response prior',
      state: stage(Boolean(spoilage.data)),
      tag: spoilage.data ? `${(spoilage.data.spoilageProbability * 100).toFixed(1)}%` : undefined,
    },
    {
      label: (
        <span className="inline-flex items-center gap-1.5">
          Laya check
          <InfoTip title="Laya (System 1)">
            A local, non-autoregressive decision model (Apache-2.0). It classifies the condition and cause from the
            facts and corroborates the engine. It never overrides it and never generates free text, so it cannot invent
            numbers.
          </InfoTip>
        </span>
      ),
      detail: 'System 1 · corroborates the engine',
      state: laya?.available ? 'done' : running ? 'run' : 'idle',
      children: (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {laya?.available ? (
            <>
              <StatusChip tier={laya.condition === 'normal' ? 'safe' : 'warning'} label={`Condition: ${laya.condition ?? '—'}`} />
              <StatusChip tier="offline" label={`Cause: ${laya.cause ?? '—'}`} />
              <StatusChip
                tier={laya.agreesWithDecision ? 'safe' : 'warning'}
                label={laya.agreesWithDecision ? 'Agrees with engine' : `Suggests ${laya.action ?? '—'}`}
              />
              <span className="font-mono text-[11px] text-text-secondary">
                {laya.model ?? 'laya'} · confidence uncalibrated
              </span>
            </>
          ) : (
            <span className="text-body-sm text-text-secondary">Laya unavailable (start the laya service).</span>
          )}
        </div>
      ),
    },
  ]

  const axisX = {
    dataKey: 'timestampMs',
    type: 'number' as const,
    domain: ['dataMin', 'dataMax'] as [string, string],
    tickFormatter: (ms: number) => formatClockTime(ms),
    tick: AXIS_STYLE,
    axisLine: AXIS_LINE,
    tickLine: false,
    minTickGap: 48,
  }

  return (
    <>
      {/* Run status strip */}
      <section className="tt-box tt-box-sm col-span-4 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 tablet:col-span-8 desktop:col-span-12">
        <span className="flex items-center gap-2">
          {running && <span className="tt-live-dot" aria-hidden />}
          <StatusChip tier={running ? 'safe' : 'offline'} label={running ? 'Running' : 'Stopped'} />
        </span>
        <span className="text-body-md font-bold">
          {selectedTruck?.label ?? '—'} <span className="text-text-secondary">·</span> {scenario.replace(/_/g, ' ').toLowerCase()}
        </span>
        <span className="tt-caps text-text-secondary">
          Elapsed <span className="text-text-primary tabular-nums">{formatDuration(elapsedMs)}</span>
        </span>
        <span className="tt-caps text-text-secondary">
          <span className="text-text-primary tabular-nums">{samples.length}</span> samples
        </span>
        <span className="tt-caps text-text-secondary">
          Speed <span className="text-text-primary">{speedMultiplier}x</span>
        </span>
        <div className="h-3 w-full overflow-hidden rounded-[4px] border-2 border-ink bg-elevated desktop:ml-auto desktop:w-56">
          <div className={running ? 'h-full w-1/3 animate-indeterminate bg-fill-sky' : 'h-full w-0'} />
        </div>
      </section>

      {/* Controls */}
      <Box
        title="Controls"
        meta="backend · simulate"
        className="col-span-4 tablet:col-span-8 desktop:col-span-4"
        bodyClassName="p-4"
      >
        <label className={FIELD_LABEL} htmlFor="sim-truck">
          Truck
        </label>
        <Select
          id="sim-truck"
          value={truckId}
          disabled={running}
          onChange={(e) => setTruckId(e.target.value)}
          options={
            trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]
          }
        />
        {selectedTruck && (
          <p className="mt-1.5 font-mono text-[12px] text-text-secondary">
            {selectedTruck.batchId} · {selectedTruck.product} · {selectedTruck.quantityKg} kg
          </p>
        )}

        <span className={clsx(FIELD_LABEL, 'mt-4')}>Scenario</span>
        <ScenarioPicker value={scenario} onChange={setScenario} disabled={running} />

        <span className={clsx(FIELD_LABEL, 'mt-4')}>Simulation speed</span>
        <div className="grid grid-cols-5 gap-2" role="group" aria-label="Simulation speed">
          {SPEED_OPTIONS.map((speed) => {
            const active = speed === speedMultiplier
            return (
              <button
                key={speed}
                type="button"
                disabled={running}
                aria-pressed={active}
                title={speed === 1 ? 'Real time' : undefined}
                onClick={() => setSpeedMultiplier(speed)}
                className={clsx(
                  FOCUS_RING,
                  'tt-press min-h-9 font-mono text-[13px] font-bold disabled:cursor-not-allowed disabled:opacity-50',
                  active ? 'bg-fill-sky text-on-fill' : 'bg-surface text-text-primary',
                )}
              >
                {speed}x
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid grid-cols-3 gap-2 border-t-[3px] border-ink pt-4">
          <Button disabled={!canStart} onClick={() => startSimulation.mutate({ truckId, scenario, speedMultiplier })}>
            Start
          </Button>
          <Button variant="secondary" disabled={!canStop} onClick={() => stopSimulation.mutate(truckId)}>
            Stop
          </Button>
          <Button variant="destructive" disabled={!canReset} onClick={() => resetSimulation.mutate(truckId)}>
            Reset
          </Button>
        </div>
      </Box>

      {/* Live sensors */}
      <Box
        title="Live sensors"
        tone="sky"
        meta={
          <>
            <span className="hidden tablet:inline">{lastSample ? `door ${lastSample.doorOpen ? 'open' : 'closed'}` : 'no data'}</span>
            <ProvenanceBadge kind="measured" />
          </>
        }
        className="col-span-4 tablet:col-span-8 desktop:col-span-8"
        bodyClassName="p-4"
      >
        {samples.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-line text-center">
            <span className="tt-caps text-text-secondary">Waiting for sensors</span>
            <span className="text-body-sm text-text-secondary">Start a simulation to stream live readings.</span>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between gap-2">
              <span className="tt-caps text-text-secondary">Temperature · °C</span>
              {lastSample && (
                <span className="font-mono text-telemetry-xl tabular-nums">
                  {lastSample.temperatureC.toFixed(1)}
                  <span className="ml-0.5 text-telemetry-md text-text-secondary">°C</span>
                </span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={290}>
              <AreaChart data={samples} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis {...axisX} />
                <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} unit="°" width={40} />
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
                  fill="var(--color-fill-sky)"
                  fillOpacity={0.35}
                  strokeWidth={2.5}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>

            <div className="mt-3 flex items-baseline justify-between gap-2 border-t-2 border-line pt-3">
              <span className="tt-caps text-text-secondary">Humidity · %</span>
              {lastSample && (
                <span className="font-mono text-telemetry-md tabular-nums">{lastSample.humidityPercent.toFixed(0)}%</span>
              )}
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={samples} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="2 4" vertical={false} />
                <XAxis {...axisX} />
                <YAxis tick={AXIS_STYLE} axisLine={AXIS_LINE} tickLine={false} unit="%" width={40} />
                <CrosshairTooltip
                  labelFormatter={(ms) => formatClockTime(Number(ms))}
                  formatter={(value) => [`${Number(value).toFixed(0)}%`, 'Humidity']}
                />
                <Line
                  type="monotone"
                  dataKey="humidityPercent"
                  stroke={CHART_COLORS.measured}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Box>

      {/* Pipeline: Data → Exposure → Deterioration → Spoilage → Laya */}
      <Box
        title="Reasoning pipeline"
        meta={running ? 'live' : 'idle'}
        className="col-span-4 overflow-visible tablet:col-span-8 desktop:col-span-5"
        bodyClassName="p-4"
      >
        <Steps items={pipeline} />
      </Box>

      {/* Derived intelligence: the same chain the Model page shows */}
      <Box
        title={
          <span className="inline-flex items-center gap-2">
            Derived intelligence
            <InfoTip title="Derived intelligence">
              Everything here is computed from the sensor readings by the deterministic engine, so it agrees with the
              Model, Optimization and Truck pages.
            </InfoTip>
          </span>
        }
        meta={<ProvenanceBadge kind="calculated" />}
        className="col-span-4 tablet:col-span-8 desktop:col-span-7"
        bodyClassName="p-4"
      >
        <div className="grid h-full auto-rows-fr grid-cols-1 gap-3 min-[420px]:grid-cols-2 tablet:grid-cols-3">
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
            tone="lilac"
            value={spoilage.data ? (spoilage.data.spoilageProbability * 100).toFixed(1) : '—'}
            unit="%"
            provenance="predicted"
            compactProvenance
            tip="Estimated probability the batch is spoiled, from a saturating exposure-response prior."
          />
          <KpiCard
            label="Humidity"
            tone="sky"
            value={lastSample ? lastSample.humidityPercent.toFixed(0) : '—'}
            unit="%"
            provenance="measured"
            compactProvenance
            tip="Relative humidity from the sensor. With temperature it drives condensation risk."
          />
          <div className={clsx('rounded-md border-[3px] border-ink p-3 shadow-level1', RISK_FILL[riskTier])}>
            <div className="flex items-start justify-between gap-2">
              <span className="tt-caps">Risk</span>
              <ProvenanceBadge kind="predicted" compact />
            </div>
            <div className="mt-1.5 font-mono text-telemetry-xl uppercase">
              {spoilage.data ? riskLabelFromProbability(spoilage.data.spoilageProbability).replace(' Risk', '') : '—'}
            </div>
          </div>
        </div>
      </Box>
    </>
  )
}

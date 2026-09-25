import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import {
  useDeterioration,
  useSimTruckOptions,
  useSimulationState,
  useSpoilagePrediction,
  useSystem1,
  useThermalExposure,
  useTruckTelemetry,
} from '@/api/hooks'
import {
  AXIS_STYLE,
  Card,
  CHART_COLORS,
  computeExcursionBands,
  CrosshairTooltip,
  ExcursionBand,
  KpiCard,
  ProvenanceBadge,
  SafeLimitLine,
  Select,
  StatusChip,
} from '@/design'
import { formatClockTime } from '@/lib/datetime'
import PipelineStrip from './PipelineStrip'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'

export default function ModelScreen() {
  const trucksQuery = useSimTruckOptions()
  const [truckId, setTruckId] = useState('')

  useEffect(() => {
    if (!truckId && trucksQuery.data && trucksQuery.data.length > 0) {
      setTruckId(trucksQuery.data[0].truckId)
    }
  }, [trucksQuery.data, truckId])

  const simState = useSimulationState(truckId)
  const running = simState.data?.running ?? false

  const telemetry = useTruckTelemetry(truckId, running)
  const thermalExposure = useThermalExposure(truckId, running)
  const deterioration = useDeterioration(truckId, running)
  const spoilage = useSpoilagePrediction(truckId, running)
  const system1 = useSystem1(truckId, running)

  const samples = telemetry.data ?? []
  const safeTemperatureC = thermalExposure.data?.safeTemperatureC
  const excursionBands = useMemo(
    () => (safeTemperatureC !== undefined ? computeExcursionBands(samples, safeTemperatureC) : []),
    [samples, safeTemperatureC],
  )

  // Sensors + AI Engine are backed by data this screen actually fetches;
  // Decision/Action/Food Loss belong to Optimization/Analytics (see PipelineStrip).
  const activeStages = running ? 2 : 0

  return (
    <>
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-label-ui uppercase text-muted">Truck</span>
            <Select
              className="w-64"
              value={truckId}
              onChange={(e) => setTruckId(e.target.value)}
              options={trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]}
            />
            <StatusChip tier={running ? 'safe' : 'offline'} label={running ? 'Running' : 'Stopped'} />
          </div>
        </div>
        <div className="mt-4">
          <PipelineStrip activeCount={activeStages} />
        </div>
      </Card>

      {/* Thermal exposure */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-8 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">Thermal Exposure</h2>
          <ProvenanceBadge kind="measured" />
        </div>
        {samples.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-body-sm text-muted">
            Start a simulation on the Simulation screen to see thermal exposure build up.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
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
        )}
      </Card>

      <div className="col-span-4 tablet:col-span-8 desktop:col-span-4 grid grid-cols-1 gap-3">
        <KpiCard
          label="Current temperature"
          value={thermalExposure.data ? thermalExposure.data.currentTemperatureC.toFixed(1) : '—'}
          unit="°C"
          provenance="measured"
        />
        <KpiCard
          label="Accumulated exposure"
          value={thermalExposure.data ? thermalExposure.data.thermalExposure.toFixed(1) : '—'}
          unit={thermalExposure.data?.unit ?? 'C·min'}
          provenance="calculated"
        />
      </div>

      {/* Deterioration */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">Deterioration</h2>
          <ProvenanceBadge kind="calculated" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <KpiCard
            label="Deterioration"
            value={deterioration.data ? `${(deterioration.data.deteriorationFraction * 100).toFixed(1)}` : '—'}
            unit="%"
            provenance="calculated"
            compactProvenance
          />
          <KpiCard
            label="Remaining shelf life"
            value={deterioration.data ? deterioration.data.remainingShelfLifeHours.toFixed(1) : '—'}
            unit="hrs"
            provenance="calculated"
            compactProvenance
          />
          <KpiCard
            label="Confidence"
            value={deterioration.data ? `${(deterioration.data.confidence * 100).toFixed(0)}` : '—'}
            unit="%"
            provenance="calculated"
            compactProvenance
          />
        </div>
      </Card>

      {/* Spoilage prediction */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">Spoilage Prediction</h2>
          <ProvenanceBadge kind="predicted" />
        </div>
        <p className="mt-1 text-body-sm text-muted">Prediction — not a confirmed food-safety determination.</p>
        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <KpiCard
            label="Spoilage probability"
            value={spoilage.data ? `${(spoilage.data.spoilageProbability * 100).toFixed(1)}` : '—'}
            unit="%"
            provenance="predicted"
            compactProvenance
          />
          <KpiCard
            label="Confidence"
            value={spoilage.data ? `${(spoilage.data.confidence * 100).toFixed(0)}` : '—'}
            unit="%"
            provenance="predicted"
            compactProvenance
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
            {spoilage.data && <p className="mt-2 text-body-sm text-muted">Model: {spoilage.data.modelVersion}</p>}
          </Card>
        </div>
      </Card>

      {/* System 1 — Laya (local, corroborates the deterministic decision) */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">System 1 — Laya</h2>
          <ProvenanceBadge kind="predicted" />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          Local, non-autoregressive decision model (Convai Innovations, Apache-2.0). It corroborates the
          deterministic decision — it never overrides it.
        </p>
        {!system1.data?.available ? (
          <div className="mt-3 text-body-sm text-muted">
            Laya is not running. Start the <span className="font-mono">laya</span> service
            (<span className="font-mono">make laya-pull</span> first).
          </div>
        ) : (
          <>
            <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-4">
              <KpiCard label="Condition" value={system1.data.condition ?? '—'} provenance="predicted" compactProvenance />
              <KpiCard label="Action" value={system1.data.action ?? '—'} provenance="predicted" compactProvenance />
              <KpiCard
                label="Urgency"
                value={system1.data.urgency !== null ? system1.data.urgency.toFixed(1) : '—'}
                unit="/ 2"
                provenance="predicted"
                compactProvenance
              />
              <KpiCard
                label="Action confidence"
                value={system1.data.actionConfidence !== null ? (system1.data.actionConfidence * 100).toFixed(0) : '—'}
                unit="%"
                provenance="predicted"
                compactProvenance
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <StatusChip
                tier={system1.data.agreesWithDecision ? 'safe' : 'warning'}
                label={system1.data.agreesWithDecision ? 'Agrees with engine' : 'Differs from engine'}
              />
              {system1.data.needsHumanReview && <StatusChip tier="critical" label="Human review suggested" />}
              <span className="text-body-sm text-muted">
                Model: {system1.data.model ?? 'laya'} · {system1.data.latencyMs ?? '—'} ms ·{' '}
                {system1.data.calibrated ? 'calibrated' : 'confidence uncalibrated'}
              </span>
            </div>
          </>
        )}
      </Card>
    </>
  )
}

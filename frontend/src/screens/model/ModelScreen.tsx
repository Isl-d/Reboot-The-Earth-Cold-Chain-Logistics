import { useEffect, useMemo, useState } from 'react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import {
  useDeterioration,
  useExplain,
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
  InfoTip,
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
  const explain = useExplain()

  // Changing the truck must clear the previous truck's AI explanation, or the
  // panel would show one truck's prose while another is selected.
  useEffect(() => {
    explain.reset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [truckId])

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
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            Thermal Exposure
            <InfoTip title="Thermal exposure">
              The sum over time of how far the temperature exceeded the batch's safe
              maximum. It captures both severity and duration, which one reading cannot.
            </InfoTip>
          </h2>
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
          tip="The latest sensor reading (MEASURED), compared against the batch's safe maximum."
        />
        <KpiCard
          label="Accumulated exposure"
          value={thermalExposure.data ? thermalExposure.data.thermalExposure.toFixed(1) : '—'}
          unit={thermalExposure.data?.unit ?? 'C·min'}
          provenance="calculated"
          tip="E_T = Σ max(0, T − T_safe)·Δt: how hot and for how long, in °C·minutes. A single reading cannot show this."
        />
      </div>

      {/* Deterioration */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            Deterioration
            <InfoTip title="Deterioration">
              How much shelf life the load has spent, from a temperature-dependent
              Arrhenius rate. Configured per product (chicken, milk, lettuce), not one
              universal threshold.
            </InfoTip>
          </h2>
          <ProvenanceBadge kind="calculated" />
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3">
          <KpiCard
            label="Deterioration"
            value={deterioration.data ? `${(deterioration.data.deteriorationFraction * 100).toFixed(1)}` : '—'}
            unit="%"
            provenance="calculated"
            compactProvenance
            tip="Fraction of shelf life already consumed, from an Arrhenius rate k(T) that rises with temperature. Configured per product."
          />
          <KpiCard
            label="Remaining shelf life"
            value={deterioration.data ? deterioration.data.remainingShelfLifeHours.toFixed(1) : '—'}
            unit="hrs"
            provenance="calculated"
            compactProvenance
            tip="Initial shelf life × (1 − deterioration). Answers whether the load will still be acceptable on arrival."
          />
          <KpiCard
            label="Confidence"
            value={deterioration.data ? `${(deterioration.data.confidence * 100).toFixed(0)}` : '—'}
            unit="%"
            provenance="calculated"
            compactProvenance
            tip="How much history the estimate is based on — more readings means higher confidence."
          />
        </div>
      </Card>

      {/* Spoilage prediction */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-6 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            Spoilage Prediction
            <InfoTip title="Spoilage prediction">
              A predicted probability the batch is spoiled, from a saturating
              exposure–response prior. It is a prediction, not a confirmed food-safety
              determination.
            </InfoTip>
          </h2>
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
            tip="Probability the batch is spoiled, from a saturating exposure–response prior. A prediction, not a food-safety determination."
          />
          <KpiCard
            label="Confidence"
            value={spoilage.data ? `${(spoilage.data.confidence * 100).toFixed(0)}` : '—'}
            unit="%"
            provenance="predicted"
            compactProvenance
            tip="The prediction's own confidence, driven by how much telemetry it has seen."
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
          <h2 className="flex items-center gap-2 text-headline-sm text-navy">
            System 1 — Laya
            <InfoTip title="Laya (System 1)">
              A local, non-autoregressive decision model (Convai Innovations, Apache-2.0).
              It reads a plain-language description of the situation and classifies the
              condition and cause. It corroborates the deterministic engine and never
              overrides it; its confidence is uncalibrated, so treat disagreement as a
              prompt to look closer, not as an error.
            </InfoTip>
          </h2>
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
            <div className="mt-3 grid grid-cols-1 gap-3 tablet:grid-cols-3 desktop:grid-cols-5">
              <KpiCard label="Condition" value={system1.data.condition ?? '—'} provenance="predicted" compactProvenance
                tip="Laya's classification of the situation from the plain-language facts." />
              <KpiCard label="Cause" value={system1.data.cause ?? '—'} provenance="predicted" compactProvenance
                tip="Laya's best guess at the root cause (refrigeration, door, sensor, traffic, heat)." />
              <KpiCard label="Action" value={system1.data.action ?? '—'} provenance="predicted" compactProvenance
                tip="Laya's suggested action, derived deterministically from its condition — so it can never contradict it." />
              <KpiCard
                label="Urgency"
                value={system1.data.urgency !== null ? system1.data.urgency.toFixed(1) : '—'}
                unit="/ 2"
                provenance="predicted"
                compactProvenance
                tip="How urgent Laya judges the situation: 0 watch · 1 soon · 2 immediate."
              />
              <KpiCard
                label="Action confidence"
                value={system1.data.actionConfidence !== null ? (system1.data.actionConfidence * 100).toFixed(0) : '—'}
                unit="%"
                provenance="predicted"
                compactProvenance
                tip="The model's confidence in its classification. Base checkpoints ship over-confident, so this is labelled uncalibrated."
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

      {/* Grounded explanation — System 1 routing/guardrails + System 2 prose */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-navy">AI Explanation</h2>
          <ProvenanceBadge kind="predicted" />
        </div>
        <p className="mt-1 text-body-sm text-muted">
          A frontier model writes the explanation from the computed facts, citing passages retrieved
          from the open-data corpus. Laya routes the request and screen the text; deterministic code
          still owns every number.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            className="rounded-sm bg-primary px-3 py-2 text-label-ui uppercase text-base disabled:opacity-50"
            disabled={!truckId || explain.isPending}
            onClick={() => truckId && explain.mutate({ truckId })}
          >
            {explain.isPending ? 'Explaining…' : 'Explain with AI'}
          </button>
          {explain.data && (
            <>
              <StatusChip
                tier={explain.data.usedFrontier ? 'warning' : 'safe'}
                label={explain.data.usedFrontier ? 'Frontier model' : 'Local answer'}
              />
              {explain.data.grounded && (
                <StatusChip tier="safe" label={`Grounded · ${explain.data.sources.length} sources`} />
              )}
              {explain.data.guardrailsFlagged && <StatusChip tier="critical" label="Guardrail tripped" />}
              {explain.data.moderationFlagged && (
                <span className="text-body-sm text-muted">Moderation note (uncalibrated)</span>
              )}
            </>
          )}
        </div>
        {explain.isError && (
          <div className="mt-3 text-body-sm text-risk-critical">Explanation failed — try again.</div>
        )}
        {explain.data && (
          <div className="mt-3 space-y-3">
            <p className="text-body-md text-navy">{explain.data.explanation}</p>
            {explain.data.sources.length > 0 && (
              <ol className="list-decimal pl-5 text-body-sm text-muted">
                {explain.data.sources.map((s, i) => (
                  <li key={i}>
                    {s.title} — {s.source} <span className="italic">({s.licence})</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}
      </Card>
    </>
  )
}

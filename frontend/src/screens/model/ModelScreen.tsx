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
  type KpiTone,
  Ontology,
  ProvenanceBadge,
  SafeLimitLine,
  Select,
  StatusChip,
  type StatusTier,
} from '@/design'
import LaylaAssessment from '@/components/truck/LaylaAssessment'
import { fmt } from '@/components/truck/tones'
import { formatClockTime } from '@/lib/datetime'
import PipelineStrip from './PipelineStrip'
import { riskLabelFromProbability, riskTierFromProbability } from '@/lib/risk'

const FULL = 'col-span-4 tablet:col-span-8 desktop:col-span-12'
// One per row on phones: the shared KpiCard's provenance pill needs the width.
const TILE = 'col-span-4 tablet:col-span-4 desktop:col-span-3'

// Spoilage tile fill by the backend probability's tier: lime safe, gold
// elevated (the MEDIUM band), coral high.
const TIER_TONE: Record<StatusTier, KpiTone> = { safe: 'lime', warning: 'sun', critical: 'coral', offline: 'paper' }

function Title({ children, tip }: { children: string; tip: string }) {
  return (
    <span className="flex items-center gap-2">
      {children}
      <InfoTip title={children}>{tip}</InfoTip>
    </span>
  )
}

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

  const option = trucksQuery.data?.find((t) => t.truckId === truckId)
  const spoilTier = spoilage.data ? riskTierFromProbability(spoilage.data.spoilageProbability) : undefined
  const s1 = system1.data?.available ? system1.data : undefined
  const ex = explain.data

  return (
    <>
      {/* Model input */}
      <Box
        className={FULL}
        title="Model input"
        meta={<StatusChip tier={running ? 'safe' : 'offline'} label={running ? 'Running' : 'Stopped'} />}
        bodyClassName="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3"
      >
        <label className="tt-caps text-text-secondary" htmlFor="model-truck">
          Truck
        </label>
        <div className="w-64 max-w-full">
          <Select
            id="model-truck"
            value={truckId}
            onChange={(e) => setTruckId(e.target.value)}
            options={trucksQuery.data?.map((t) => ({ value: t.truckId, label: t.label })) ?? [{ value: '', label: 'Loading…' }]}
          />
        </div>
        {option && (
          <span className="font-mono text-[12px] font-bold text-text-secondary">
            {option.product} · {option.batchId} · {option.quantityKg} kg
          </span>
        )}
      </Box>

      {/* 1. Four KPI tiles */}
      <div className={TILE}>
        <KpiCard
          label="Current temperature"
          value={fmt(thermalExposure.data?.currentTemperatureC)}
          unit="°C"
          tone="sky"
          provenance="measured"
          tip="The latest sensor reading (MEASURED), compared against the batch's safe maximum."
        />
      </div>
      <div className={TILE}>
        <KpiCard
          label="Accumulated exposure"
          value={fmt(thermalExposure.data?.thermalExposure)}
          unit={thermalExposure.data?.unit ?? 'C·min'}
          provenance="calculated"
          tip="E_T = Σ max(0, T − T_safe)·Δt: how hot and for how long, in °C·minutes. A single reading cannot show this."
        />
      </div>
      <div className={TILE}>
        <KpiCard
          label="Remaining shelf life"
          value={fmt(deterioration.data?.remainingShelfLifeHours)}
          unit="hrs"
          provenance="calculated"
          tip="Initial shelf life × (1 − deterioration). Answers whether the load will still be acceptable on arrival."
        />
      </div>
      <div className={TILE}>
        <KpiCard
          label="Spoilage probability"
          value={spoilage.data ? fmt(spoilage.data.spoilageProbability * 100) : '—'}
          unit="%"
          tone={spoilTier ? TIER_TONE[spoilTier] : 'paper'}
          provenance="predicted"
          tip="Probability the batch is spoiled, from a saturating exposure-response prior. A prediction, not a food-safety determination."
        />
      </div>

      {/* 2. LAYLA's assessment */}
      <LaylaAssessment
        className={FULL}
        text={ex?.explanation}
        chips={
          ex && (
            <>
              <span className="tt-chip">{ex.usedFrontier ? 'Frontier model' : 'Local answer'}</span>
              {ex.grounded && <span className="tt-chip">Grounded · {ex.sources.length}</span>}
              {ex.guardrailsFlagged && <span className="tt-chip bg-fill-coral text-on-fill">Guardrail tripped</span>}
            </>
          )
        }
        empty={
          <>
            A frontier model writes the explanation from the computed facts, citing passages from the
            open-data corpus. Laya routes the request and screens the text; code still owns every number.
          </>
        }
        source={
          ex ? (
            <>
              Source · {ex.source}
              {ex.routing && <> · routing {ex.routing}</>} · {ex.grounded ? `${ex.sources.length} sources` : 'not grounded'} ·
              numbers computed in code
              {ex.moderationFlagged && <> · moderation note (uncalibrated)</>}
            </>
          ) : (
            <>Source · POST /api/ai/explain · numbers computed in code</>
          )
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!truckId || explain.isPending} onClick={() => truckId && explain.mutate({ truckId })}>
            {explain.isPending ? 'LAYLA is writing…' : ex ? 'Explain again' : 'Explain with LAYLA'}
          </Button>
          {explain.isError && <span className="text-body-sm font-bold text-risk-critical">Explanation failed. Try again.</span>}
        </div>
        {ex && ex.sources.length > 0 && (
          <ol className="m-0 grid gap-1 pl-5 text-body-sm text-text-secondary">
            {ex.sources.map((s, i) => (
              <li key={i}>
                <span className="font-bold text-text-primary">{s.title ?? 'Untitled'}</span>
                {s.source && <> · {s.source}</>} {s.licence && <span className="font-mono text-[11px]">({s.licence})</span>}
              </li>
            ))}
          </ol>
        )}
      </LaylaAssessment>

      {/* 3. Backend process */}
      <Box
        className="col-span-4 tablet:col-span-8 desktop:col-span-5"
        title="Backend process"
        meta="Data → Food loss"
        bodyClassName="p-4"
      >
        <PipelineStrip
          telemetry={{ data: telemetry.data, loading: telemetry.isLoading }}
          thermal={{ data: thermalExposure.data, loading: thermalExposure.isLoading }}
          deterioration={{ data: deterioration.data, loading: deterioration.isLoading }}
          spoilage={{ data: spoilage.data, loading: spoilage.isLoading }}
          system1={{ data: system1.data, loading: system1.isLoading }}
          explain={{ data: explain.data, loading: explain.isPending }}
        />
      </Box>

      <div className="col-span-4 tablet:col-span-8 desktop:col-span-7 grid content-start gap-4">
        {/* Thermal exposure */}
        <Box
          title={
            <Title tip="The sum over time of how far the temperature exceeded the batch's safe maximum. It captures both severity and duration, which one reading cannot.">
              Thermal exposure
            </Title>
          }
          tone="sky"
          meta={<ProvenanceBadge kind="measured" />}
          bodyClassName="p-3"
        >
          {samples.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-body-sm text-text-secondary">
              Start a simulation on the Simulation screen to see thermal exposure build up.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={samples} margin={{ top: 14, right: 12, left: 0, bottom: 2 }}>
                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                <XAxis
                  dataKey="timestampMs"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ms) => formatClockTime(ms)}
                  tick={AXIS_STYLE}
                  tickLine={false}
                  axisLine={AXIS_LINE}
                  minTickGap={40}
                  tickMargin={6}
                />
                <YAxis tick={AXIS_STYLE} tickLine={false} axisLine={AXIS_LINE} unit="°C" width={48} />
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
                  fillOpacity={0.16}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Box>

        <div className="grid grid-cols-1 gap-4 tablet:grid-cols-2">
          {/* Deterioration */}
          <Box
            title={
              <Title tip="How much shelf life the load has spent, from a temperature-dependent Arrhenius rate. Configured per product (chicken, milk, lettuce), not one universal threshold.">
                Deterioration
              </Title>
            }
            meta={<ProvenanceBadge kind="calculated" />}
            bodyClassName="grid grid-cols-2 gap-3 p-3"
          >
            <KpiCard
              label="Spent"
              value={deterioration.data ? fmt(deterioration.data.deteriorationFraction * 100) : '—'}
              unit="%"
              provenance="calculated"
              compactProvenance
              tip="Fraction of shelf life already consumed, from an Arrhenius rate k(T) that rises with temperature. Configured per product."
            />
            <KpiCard
              label="Confidence"
              value={deterioration.data ? fmt(deterioration.data.confidence * 100, 0) : '—'}
              unit="%"
              provenance="calculated"
              compactProvenance
              tip="How much history the estimate is based on. More readings means higher confidence."
            />
          </Box>

          {/* Spoilage prediction */}
          <Box
            title={
              <Title tip="A predicted probability the batch is spoiled, from a saturating exposure-response prior. It is a prediction, not a confirmed food-safety determination.">
                Spoilage prediction
              </Title>
            }
            meta={<ProvenanceBadge kind="predicted" />}
            bodyClassName="grid grid-cols-2 gap-3 p-3"
          >
            <KpiCard
              label="Confidence"
              value={spoilage.data ? fmt(spoilage.data.confidence * 100, 0) : '—'}
              unit="%"
              provenance="predicted"
              compactProvenance
              tip="The prediction's own confidence, driven by how much telemetry it has seen."
            />
            <div className="tt-box tt-box-sm flex flex-col gap-2 p-3">
              <span className="tt-caps">Risk</span>
              {spoilage.data ? (
                <StatusChip
                  tier={riskTierFromProbability(spoilage.data.spoilageProbability)}
                  label={riskLabelFromProbability(spoilage.data.spoilageProbability)}
                  className="self-start"
                />
              ) : (
                <span className="text-body-sm text-text-secondary">—</span>
              )}
              {spoilage.data && (
                <span className="font-mono text-[11px] font-bold text-text-secondary">Model {spoilage.data.modelVersion}</span>
              )}
            </div>
            <p className="col-span-2 m-0 text-body-sm text-text-secondary">
              A prediction, not a confirmed food-safety determination.
            </p>
          </Box>
        </div>

        {/* System 1: Laya, local, corroborates the deterministic decision */}
        <Box
                  title={
            <Title tip="A local, non-autoregressive decision model (Convai Innovations, Apache-2.0). It reads a plain-language description of the situation and classifies the condition and cause. It corroborates the deterministic engine and never overrides it; its confidence is uncalibrated, so treat disagreement as a prompt to look closer, not as an error.">
              System 1 · Laya
            </Title>
          }
          meta={<ProvenanceBadge kind="predicted" />}
          bodyClassName="p-4"
        >
          <p className="m-0 text-body-sm text-text-secondary">
            Local, non-autoregressive decision model (Convai Innovations, Apache-2.0). It corroborates the
            deterministic decision and never overrides it.
          </p>
          {!s1 ? (
            <div className="mt-3 text-body-sm text-text-secondary">
              Laya is not running. Start the <span className="font-mono">laya</span> service
              (<span className="font-mono">make laya-pull</span> first).
            </div>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-2 gap-3 tablet:grid-cols-3">
                <KpiCard label="Condition" value={s1.condition ?? '—'} provenance="predicted" compactProvenance
                  tip="Laya's classification of the situation from the plain-language facts." />
                <KpiCard label="Cause" value={s1.cause ?? '—'} provenance="predicted" compactProvenance
                  tip="Laya's best guess at the root cause (refrigeration, door, sensor, traffic, heat)." />
                <KpiCard label="Action" value={s1.action ?? '—'} provenance="predicted" compactProvenance
                  tip="Laya's suggested action, derived deterministically from its condition, so it can never contradict it." />
                <KpiCard
                  label="Urgency"
                  value={s1.urgency !== null ? s1.urgency.toFixed(1) : '—'}
                  unit="/ 2"
                  provenance="predicted"
                  compactProvenance
                  tip="How urgent Laya judges the situation: 0 watch · 1 soon · 2 immediate."
                />
                <KpiCard
                  label="Action confidence"
                  value={s1.actionConfidence !== null ? (s1.actionConfidence * 100).toFixed(0) : '—'}
                  unit="%"
                  provenance="predicted"
                  compactProvenance
                  tip="The model's confidence in its classification. Base checkpoints ship over-confident, so this is labelled uncalibrated."
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StatusChip
                  tier={s1.agreesWithDecision ? 'safe' : 'warning'}
                  label={s1.agreesWithDecision ? 'Agrees with engine' : 'Differs from engine'}
                />
                {s1.needsHumanReview && <StatusChip tier="critical" label="Human review suggested" />}
                <span className="font-mono text-[11px] font-bold uppercase tracking-[0.06em] text-text-secondary">
                  Model {s1.model ?? 'laya'} · {s1.latencyMs ?? '—'} ms · {s1.calibrated ? 'calibrated' : 'confidence uncalibrated'}
                </span>
              </div>
            </>
          )}
        </Box>
      </div>

      {/* Ontology: how this answer is built */}
      <Box className={FULL} title="Ontology · how this answer is built" meta="Truck → LAYLA">
        <Ontology
          entities={[
            { type: 'Truck', value: truckId || '—', tone: 'sky' },
            { type: 'Telemetry', value: samples.length > 0 ? `${samples.length} readings` : '—', tone: 'sky' },
            {
              type: 'Condition',
              value: thermalExposure.data
                ? `E_T ${fmt(thermalExposure.data.thermalExposure)} ${thermalExposure.data.unit}`
                : '—',
            },
            {
              type: 'Deterioration',
              value: deterioration.data ? `${fmt(deterioration.data.deteriorationFraction * 100)}% spent` : '—',
            },
            {
              type: 'Spoilage',
              value: spoilage.data ? `${fmt(spoilage.data.spoilageProbability * 100)}%` : '—',
              tone: spoilTier === 'critical' ? 'coral' : spoilTier === 'warning' ? 'sun' : spoilTier === 'safe' ? 'lime' : 'paper',
            },
            { type: 'Laya', value: s1?.condition ?? '—' },
            { type: 'Statement', value: ex ? 'Explained' : '—', tone: 'lilac' },
          ]}
          relations={['reads', 'builds', 'ages', 'predicts', 'checked by', 'explained by']}
        />
      </Box>
    </>
  )
}

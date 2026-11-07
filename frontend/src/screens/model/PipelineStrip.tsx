import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type {
  Deterioration,
  ExplainResult,
  SpoilagePrediction,
  System1Decision,
  TelemetrySample,
  ThermalExposure,
} from '@/api/types'
import { Steps, type StepItem, type StepState } from '@/design'

// The reasoning pipeline (Data → Condition → Prediction → Optimization →
// Decision → Food loss), then LAYLA's explanation, as QAI numbered steps.
// A step is lit only when this screen holds that stage's real backend output;
// Optimization and Food loss are fetched by their own screens, so they stay
// idle here with a link rather than claiming a state we cannot back.

interface Stage<T> {
  data: T | undefined
  loading: boolean
}

interface PipelineStripProps {
  telemetry: Stage<TelemetrySample[]>
  thermal: Stage<ThermalExposure>
  deterioration: Stage<Deterioration>
  spoilage: Stage<SpoilagePrediction>
  system1: Stage<System1Decision>
  explain: Stage<ExplainResult>
}

/** Compact JSON of the stage output. Rounds numbers for display only. */
function Json({ value }: { value: Record<string, unknown> }) {
  const body = Object.entries(value)
    .map(([k, v]) => `"${k}": ${JSON.stringify(typeof v === 'number' && !Number.isInteger(v) ? Number(v.toFixed(3)) : v)}`)
    .join(', ')
  return <pre className="tt-pre whitespace-pre-wrap break-words">{`{ ${body} }`}</pre>
}

/** Steps renders labels in body type; keep them bold like the QAI pipeline. */
const L = (text: string) => <span className="font-extrabold">{text}</span>

function state(has: boolean, loading: boolean): StepState {
  if (has) return 'done'
  return loading ? 'run' : 'idle'
}

function Elsewhere({ to, children }: { to: string; children: ReactNode }) {
  return (
    <span className="mt-1 block text-body-sm text-text-secondary">
      {children}{' '}
      <Link to={to} className="font-bold text-text-primary underline decoration-2 underline-offset-2">
        Open →
      </Link>
    </span>
  )
}

export default function PipelineStrip({ telemetry, thermal, deterioration, spoilage, system1, explain }: PipelineStripProps) {
  const samples = telemetry.data ?? []
  const latest = samples[samples.length - 1]
  const s1 = system1.data?.available ? system1.data : undefined
  const prediction =
    deterioration.data || spoilage.data
      ? {
          deteriorationFraction: deterioration.data?.deteriorationFraction ?? null,
          remainingShelfLifeHours: deterioration.data?.remainingShelfLifeHours ?? null,
          spoilageProbability: spoilage.data?.spoilageProbability ?? null,
          confidence: spoilage.data?.confidence ?? null,
          modelVersion: spoilage.data?.modelVersion ?? null,
        }
      : undefined

  const items: StepItem[] = [
    {
      label: L('Data'),
      detail: 'simulator → MQTT → ingest',
      state: state(samples.length > 0, telemetry.loading),
      tag: samples.length > 0 ? `${samples.length} readings` : undefined,
      children: latest && (
        <Json
          value={{
            temperatureC: latest.temperatureC,
            humidityPercent: latest.humidityPercent,
            doorOpen: latest.doorOpen,
          }}
        />
      ),
    },
    {
      label: L('Condition'),
      detail: 'features.py · thermal exposure',
      state: state(Boolean(thermal.data), thermal.loading),
      children: thermal.data && <Json value={{ ...thermal.data }} />,
    },
    {
      label: L('Prediction'),
      detail: 'features.py · spoilage.py',
      state: state(Boolean(prediction), deterioration.loading || spoilage.loading),
      children: prediction && <Json value={prediction} />,
    },
    {
      label: L('Optimization'),
      detail: 'optimization.py',
      state: 'idle',
      children: <Elsewhere to="/optimization">Solved on the Optimize screen.</Elsewhere>,
    },
    {
      label: L('Decision'),
      detail: 'decision.py · Laya System 1 corroborates',
      state: state(Boolean(s1), system1.loading),
      tag: s1?.latencyMs != null ? `${s1.latencyMs} ms` : undefined,
      children: s1 ? (
        <Json
          value={{
            condition: s1.condition,
            cause: s1.cause,
            action: s1.action,
            agreesWithDecision: s1.agreesWithDecision,
          }}
        />
      ) : (
        <Elsewhere to="/optimization">Laya is offline. The engine decision is on Optimize.</Elsewhere>
      ),
    },
    {
      label: L('Food loss'),
      detail: 'foodloss.py',
      state: 'idle',
      children: <Elsewhere to="/analytics">Totals live on the Food loss screen.</Elsewhere>,
    },
    {
      label: L("LAYLA's explanation"),
      detail: 'POST /api/ai/explain',
      state: state(Boolean(explain.data), explain.loading),
      tag: explain.data ? explain.data.source : undefined,
      children: explain.data && (
        <Json
          value={{
            source: explain.data.source,
            routing: explain.data.routing,
            grounded: explain.data.grounded,
            sources: explain.data.sources.length,
            action: explain.data.action,
          }}
        />
      ),
    },
  ]

  return <Steps items={items} />
}

import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { RiskBadge } from '../components/common/RiskBadge'
import { PageHeader } from '../components/layout/PageHeader'
import PageGrid from '../components/layout/PageGrid'
import { GpsTrajectoryChart } from '../components/charts/GpsTrajectoryChart'
import { HumidityChart } from '../components/charts/HumidityChart'
import { ThermalExposureChart } from '../components/charts/ThermalExposureChart'
import { TemperatureChart } from '../components/charts/TemperatureChart'
import KpiTile from '../components/truck/KpiTile'
import LaylaAssessment from '../components/truck/LaylaAssessment'
import { fmt, RISK_ONTOLOGY_TONE, RISK_TONE } from '../components/truck/tones'
import { Box, Breakdown, Ontology, ProvenanceBadge, type BreakdownRow } from '../design'
import { clsx } from '../design/clsx'
import { useTelemetry } from '../hooks/useTelemetry'
import { useTruckDetail } from '../hooks/useTruckDetail'
import type { Prediction } from '../types'

// Fields the backend already sends on GET /api/trucks/{id} (API_CONTRACT.md,
// all CALCULATED) that the shared Prediction type does not declare yet.
type LoadedPrediction = Prediction & {
  factors?: Record<string, number>
  exposureMinutes?: number
}

// The backend's risk factor keys (backend/intelligence/risk.py), each a 0-100
// sub-score. Display labels only; the values come from the backend.
const FACTOR_LABEL: Record<string, { code: string; label: string }> = {
  spoilage_probability: { code: 'SP', label: 'Spoilage probability' },
  thermal_exposure: { code: 'TE', label: 'Thermal exposure' },
  remaining_shelf_life: { code: 'SL', label: 'Shelf life used' },
  anomaly: { code: 'AN', label: 'Anomaly' },
  route_delay: { code: 'RD', label: 'Route delay' },
  humidity_exposure: { code: 'HU', label: 'Humidity exposure' },
  temperature_deviation: { code: 'TD', label: 'Temperature deviation' },
}

const FULL = 'col-span-4 tablet:col-span-8 desktop:col-span-12'

function Reading({ label, value, alarm }: { label: string; value: string; alarm?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b-2 border-line px-4 py-2 last:border-b-0">
      <span className="tt-caps text-text-secondary">{label}</span>
      {alarm ? (
        <span className="tt-chip border-on-fill bg-fill-coral text-on-fill">{value}</span>
      ) : (
        <span className="font-mono text-[14px] font-bold tabular-nums">{value}</span>
      )}
    </div>
  )
}

function Stat({ label, value, unit, tone }: { label: string; value: string; unit?: string; tone?: string }) {
  return (
    <div className="min-w-0 px-3 py-2.5">
      <div className="tt-caps text-text-secondary">{label}</div>
      <div className={clsx('mt-0.5 font-mono text-[20px] font-bold tabular-nums', tone)}>
        {value}
        {unit && <span className="ml-1 text-[12px] opacity-75">{unit}</span>}
      </div>
    </div>
  )
}

function ChartBox({ title, meta, children, className }: { title: string; meta?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Box title={title} meta={meta} className={className} bodyClassName="flex flex-col p-2 pt-3">
      <div className="h-[220px] min-h-[220px] flex-1">{children}</div>
    </Box>
  )
}

export function TruckDetail() {
  const { id = '' } = useParams<{ id: string }>()
  const { data } = useTruckDetail(id)
  const { data: telemetry = [] } = useTelemetry(id)

  if (!data)
    return (
      <div className="tt-canvas flex flex-1 items-center justify-center">
        <span className="tt-caps text-text-secondary">Loading truck {id}…</span>
      </div>
    )

  const { truck, batch, recommendation } = data
  const prediction = data.prediction as LoadedPrediction
  const level = prediction.riskLevel
  const overMax = truck.temperatureC > batch.safeMaxTempC
  const reasoning = recommendation.reasoning || null

  // Risk factor breakdown, strongest first. Falls back to the key readings
  // when an older backend does not send the factor map.
  const factorRows: BreakdownRow[] = prediction.factors
    ? Object.entries(prediction.factors)
        .sort((a, b) => b[1] - a[1])
        .map(([key, v]) => ({
          code: FACTOR_LABEL[key]?.code ?? key.slice(0, 2).toUpperCase(),
          label: FACTOR_LABEL[key]?.label ?? key.replace(/_/g, ' '),
          value: `${fmt(v)} / 100`,
        }))
    : [
        { code: 'TE', label: 'Thermal exposure', value: `${fmt(prediction.thermalExposure)} °C·min` },
        { code: 'EM', label: 'Minutes above safe max', value: `${fmt(prediction.exposureMinutes)} min` },
        { code: 'SL', label: 'Shelf life left', value: `${fmt(prediction.remainingShelfLifeHours)} h` },
        { code: 'SP', label: 'Spoilage probability', value: `${fmt(prediction.spoilageProbability * 100)}%` },
      ]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <PageHeader
        eyebrow="Operate"
        title={
          <>
            Truck <em>{truck.id}</em>
          </>
        }
        leading={
          <Link
            to="/fleet"
            className="tt-caps rounded-md border-2 border-on-band px-2 py-1 text-on-band no-underline transition-colors hover:bg-on-band hover:text-band"
          >
            ← Fleet
          </Link>
        }
        meta={
          <span className="font-mono font-bold">
            {batch.product} · {batch.id} · {batch.quantityKg} kg
          </span>
        }
      >
        {truck.doorOpen && <span className="tt-chip bg-fill-coral text-on-fill">Door open</span>}
        {!truck.refrigerationOn && <span className="tt-chip bg-fill-coral text-on-fill">Refrigeration off</span>}
        <RiskBadge level={level} score={prediction.riskScore} className="px-2.5 py-1 text-[13px]" />
      </PageHeader>

      <div className="tt-canvas flex-1 overflow-y-auto px-4 py-5 tablet:px-5">
        <PageGrid>
          {/* 1. Four coloured KPI tiles */}
          <KpiTile
            className="col-span-2 tablet:col-span-4 desktop:col-span-3"
            label="Temperature"
            value={fmt(truck.temperatureC)}
            unit="°C"
            tone="sky"
            provenance={<ProvenanceBadge kind="measured" />}
            sub={
              overMax
                ? `+${fmt(truck.temperatureC - batch.safeMaxTempC)}°C over max`
                : `Safe ${batch.safeMinTempC} to ${batch.safeMaxTempC}°C`
            }
          />
          <KpiTile
            className="col-span-2 tablet:col-span-4 desktop:col-span-3"
            label="Risk score"
            value={String(prediction.riskScore)}
            unit="/ 100"
            tone={RISK_TONE[level]}
            provenance={<ProvenanceBadge kind="calculated" />}
            sub={`${level} risk`}
          />
          <KpiTile
            className="col-span-2 tablet:col-span-4 desktop:col-span-3"
            label="Shelf life left"
            value={fmt(prediction.remainingShelfLifeHours)}
            unit="h"
            provenance={<ProvenanceBadge kind="calculated" />}
            sub={`of ${batch.initialShelfLifeHours} h at packing`}
          />
          <KpiTile
            className="col-span-2 tablet:col-span-4 desktop:col-span-3"
            label="Spoilage"
            value={fmt(prediction.spoilageProbability * 100)}
            unit="%"
            provenance={<ProvenanceBadge kind="predicted" />}
            sub={`Confidence ${fmt(prediction.confidence * 100, 0)}%`}
          />

          {/* 2. LAYLA's assessment + the recommended action */}
          <LaylaAssessment
            className="col-span-4 tablet:col-span-8 desktop:col-span-7"
            text={reasoning}
            empty={
              <>
                No AI explanation for this reading yet. Every number on this page comes from the
                deterministic engine; LAYLA only adds prose when the model asks for it.
              </>
            }
            source={<>Source · backend recommendation.reasoning · numbers computed in code</>}
          />

          <Box
            className={clsx(
              'col-span-4 tablet:col-span-8 desktop:col-span-5',
              level === 'CRITICAL' && '[animation:glow-critical_2s_ease-in-out_infinite]',
            )}
            tone="lime"
            title="Recommended action"
            meta={<ProvenanceBadge kind="recommended" />}
            bodyClassName="flex flex-col"
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 px-4 pb-3 pt-4">
              <span className="text-[30px] font-extrabold leading-none tracking-[-0.02em]">
                {recommendation.action.replace(/_/g, ' ')}
              </span>
              {recommendation.destinationId && (
                <span className="tt-chip bg-fill-sky text-on-fill">→ {recommendation.destinationId}</span>
              )}
            </div>
            <div className="mt-auto grid grid-cols-3 divide-x-2 divide-line border-t-[3px] border-ink">
              <Stat label="ETA" value={recommendation.etaMinutes != null ? fmt(recommendation.etaMinutes) : '—'} unit="min" />
              <Stat label="Exp. loss" value={fmt(recommendation.expectedLossPercent, 2)} unit="%" />
              <Stat label="Food saved" value={fmt(recommendation.foodSavedKg)} unit="kg" tone="text-risk-low" />
            </div>
          </Box>

          {/* 3. Ontology: how this answer is built */}
          <Box
            className={FULL}
            title="Ontology · how this answer is built"
            meta="Truck → LAYLA"
          >
            <Ontology
              entities={[
                { type: 'Truck', value: truck.id, tone: 'sky' },
                { type: 'Cargo', value: `${batch.product} · ${batch.quantityKg} kg` },
                { type: 'Condition', value: `${fmt(truck.temperatureC)}°C · E_T ${fmt(prediction.thermalExposure)}`, tone: 'sky' },
                { type: 'Prediction', value: `${fmt(prediction.spoilageProbability * 100)}% spoilage` },
                { type: 'Risk', value: `${level} ${prediction.riskScore}`, tone: RISK_ONTOLOGY_TONE[level] },
                { type: 'Decision', value: recommendation.action.replace(/_/g, ' '), tone: 'lime' },
                { type: 'Statement', value: reasoning ? 'Explained' : '—', tone: 'lilac' },
              ]}
              relations={['carries', 'sensed as', 'predicts', 'scored as', 'decides', 'explained by']}
            />
          </Box>

          {/* 4. Temperature chart + risk factor breakdown */}
          <ChartBox
            className="col-span-4 tablet:col-span-8 desktop:col-span-8"
            title="Temperature"
            meta={
              <>
                °C · last 6 h <ProvenanceBadge kind="measured" />
              </>
            }
          >
            <TemperatureChart data={telemetry} safeMinTempC={batch.safeMinTempC} safeMaxTempC={batch.safeMaxTempC} fill />
          </ChartBox>

          <Box
            className="col-span-4 tablet:col-span-8 desktop:col-span-4"
            tone={RISK_TONE[level]}
            title={prediction.factors ? 'Risk factors' : 'Key readings'}
            meta={
              <>
                {prediction.factors ? '0 to 100' : level}
                <ProvenanceBadge kind="calculated" />
              </>
            }
          >
            <Breakdown
              rows={factorRows}
              total={{ code: 'RS', label: 'Risk score (weighted)', value: `${prediction.riskScore} / 100` }}
            />
          </Box>

          {/* 5. Readings and the remaining charts */}
          <Box
            className="col-span-4 tablet:col-span-4 desktop:col-span-3"
            tone="sky"
            title="Sensor readings"
            meta={<ProvenanceBadge kind="measured" />}
          >
            <Reading label="Humidity" value={`${fmt(truck.humidityPct, 0)}% RH`} />
            <Reading label="Speed" value={`${fmt(truck.speedKmh)} km/h`} />
            <Reading label="G-force" value={`${fmt(truck.gForce, 2)} g`} />
            <Reading label="Door" value={truck.doorOpen ? 'Open' : 'Closed'} alarm={truck.doorOpen} />
            <Reading label="Refrigeration" value={truck.refrigerationOn ? 'On' : 'Off'} alarm={!truck.refrigerationOn} />
          </Box>

          <ChartBox className="col-span-4 tablet:col-span-4 desktop:col-span-3" title="Humidity" meta="% RH">
            <HumidityChart data={telemetry} fill />
          </ChartBox>

          <ChartBox
            className="col-span-4 tablet:col-span-4 desktop:col-span-3"
            title="Above safe max"
            meta={`°C over ${batch.safeMaxTempC}`}
          >
            <ThermalExposureChart data={telemetry} safeMaxTempC={batch.safeMaxTempC} fill />
          </ChartBox>

          <ChartBox className="col-span-4 tablet:col-span-4 desktop:col-span-3" title="GPS trace" meta="lon · lat">
            <GpsTrajectoryChart data={telemetry} fill />
          </ChartBox>
        </PageGrid>
      </div>
    </div>
  )
}

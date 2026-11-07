import { useState, type ReactNode } from 'react'
import { useScenarioComparison } from '@/api/hooks'
import type { ScenarioId } from '@/api/types'
import { Box, KpiCard, ProvenanceBadge, ScenarioPicker, type BoxTone } from '@/design'
import AnimatedBar from './AnimatedBar'

function OutcomeColumn({
  title,
  tone,
  barClassName,
  percent,
  scaleMax,
  note,
}: {
  title: string
  tone: BoxTone
  barClassName: string
  percent: number | undefined
  scaleMax: number
  note: ReactNode
}) {
  return (
    <Box
      title={title}
      tone={tone}
      meta={<ProvenanceBadge kind="calculated" />}
      className="col-span-4 tablet:col-span-4 desktop:col-span-4"
      bodyClassName="flex flex-col p-4"
    >
      <span className="tt-caps text-text-secondary">Expected loss</span>
      <p className="mt-1 font-mono text-[44px] font-bold leading-none tabular-nums">
        {percent !== undefined ? percent.toFixed(1) : '—'}
        <span className="ml-1 text-telemetry-md text-text-secondary">%</span>
      </p>
      <div className="mt-auto pt-4">
        <AnimatedBar
          percent={percent ?? 0}
          scaleMax={scaleMax}
          colorClassName={barClassName}
          label={percent !== undefined ? `${percent.toFixed(1)}%` : undefined}
        />
      </div>
      <p className="mt-3 text-body-sm text-text-secondary">{note}</p>
    </Box>
  )
}

export default function ComparisonScreen() {
  const [scenario, setScenario] = useState<ScenarioId>('REFRIGERATION_FAILURE')
  const comparison = useScenarioComparison(scenario)
  const data = comparison.data
  // Both columns share one bar scale so their heights compare honestly.
  const scaleMax = data ? Math.max(data.withoutInterventionLossPercent, data.withOptimizationLossPercent, 1) : 100

  return (
    <>
      <Box
        title="Scenario"
        meta="6 scenarios"
        className="col-span-4 tablet:col-span-8 desktop:col-span-12"
        bodyClassName="p-4"
      >
        <div className="desktop:[&>div]:grid-cols-3">
          <ScenarioPicker value={scenario} onChange={setScenario} />
        </div>
      </Box>

      <OutcomeColumn
        title="Do nothing"
        tone="coral"
        barClassName="bg-fill-coral"
        percent={data?.withoutInterventionLossPercent}
        scaleMax={scaleMax}
        note="No intervention. The load stays on its route."
      />

      <OutcomeColumn
        title="Act now"
        tone="lime"
        barClassName="bg-fill-lime"
        percent={data?.withOptimizationLossPercent}
        scaleMax={scaleMax}
        note="Truck rerouted per the optimization engine's recommendation."
      />

      {/* The difference: backend numbers, shown as the result */}
      <Box
        title="Difference"
        tone="ink"
        meta="act now vs do nothing"
        className="col-span-4 tablet:col-span-8 desktop:col-span-4"
        bodyClassName="flex flex-col gap-3 p-4"
      >
        <div className="rounded-md border-[3px] border-ink bg-fill-lime p-4 text-on-fill shadow-level1">
          <div className="flex items-start justify-between gap-2">
            <span className="tt-caps">Food saved</span>
            <ProvenanceBadge kind="calculated" compact />
          </div>
          <p className="mt-2 font-mono text-[52px] font-bold leading-none tabular-nums">
            {data ? data.foodSavedKg.toLocaleString() : '—'}
            <span className="ml-1.5 text-telemetry-xl opacity-75">kg</span>
          </p>
          <p className="mt-3 font-mono text-[13px] font-bold">
            loss {data ? `${data.withoutInterventionLossPercent.toFixed(1)}%` : '—'} →{' '}
            {data ? `${data.withOptimizationLossPercent.toFixed(1)}%` : '—'}
          </p>
        </div>
        <KpiCard
          label="Money saved"
          value={data ? data.financialSavedQar.toLocaleString() : '—'}
          unit="QAR"
          provenance="calculated"
          compactProvenance
        />
        {comparison.isError && <p className="text-body-sm font-bold text-risk-critical">Could not load this comparison.</p>}
      </Box>
    </>
  )
}

import { useState } from 'react'
import { useScenarioComparison } from '@/api/hooks'
import type { ScenarioId } from '@/api/types'
import { Card, ProvenanceBadge, ScenarioPicker, StatusChip } from '@/design'
import AnimatedBar from './AnimatedBar'

export default function ComparisonScreen() {
  const [scenario, setScenario] = useState<ScenarioId>('REFRIGERATION_FAILURE')
  const comparison = useScenarioComparison(scenario)
  const data = comparison.data

  return (
    <>
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-12 p-4">
        <h2 className="text-headline-sm text-navy">Scenario</h2>
        <div className="mt-3">
          <ScenarioPicker value={scenario} onChange={setScenario} />
        </div>
      </Card>

      {/*
        Inline style, not a border-{color} class: Card's own base classes
        already set `border-line` at the same specificity, and which one
        wins would depend on Tailwind's internal utility order, not this
        className string's order — the same cascade trap already hit once
        in TopBar's range-control visibility fix. Colours are the themed
        Critical/Safe status-tier borders.
      */}
      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-5 p-6" style={{ borderColor: 'var(--color-status-critical-border)' }}>
        <div className="flex items-center justify-between">
          <StatusChip tier="critical" label="Without Intervention" />
          <ProvenanceBadge kind="calculated" compact />
        </div>
        <p className="mt-6 font-mono text-telemetry-xl tabular-nums text-status-critical-fg">
          {data ? data.withoutInterventionLossPercent.toFixed(1) : '—'}
          <span className="ml-1 text-telemetry-md text-muted">% expected loss</span>
        </p>
        <div className="mt-4">
          <AnimatedBar percent={data?.withoutInterventionLossPercent ?? 0} colorClassName="bg-status-critical" />
        </div>
        <p className="mt-3 text-body-sm text-muted">No optimization engine intervention.</p>
      </Card>

      <div className="col-span-4 tablet:col-span-8 desktop:col-span-2 flex flex-col items-center justify-center gap-6 text-center">
        <div>
          <p className="text-label-ui uppercase text-muted">Food Saved</p>
          <p className="mt-1 font-mono text-telemetry-xl tabular-nums text-status-safe-fg">
            {data ? data.foodSavedKg.toLocaleString() : '—'}
            <span className="ml-1 text-telemetry-md text-muted">kg</span>
          </p>
        </div>
        <div>
          <p className="text-label-ui uppercase text-muted">Money Saved</p>
          <p className="mt-1 font-mono text-telemetry-xl tabular-nums text-status-safe-fg">
            {data ? `QAR ${data.financialSavedQar.toLocaleString()}` : '—'}
          </p>
        </div>
      </div>

      <Card className="col-span-4 tablet:col-span-8 desktop:col-span-5 p-6" style={{ borderColor: 'var(--color-status-safe-border)' }}>
        <div className="flex items-center justify-between">
          <StatusChip tier="safe" label="With Optimization" />
          <ProvenanceBadge kind="calculated" compact />
        </div>
        <p className="mt-6 font-mono text-telemetry-xl tabular-nums text-status-safe-fg">
          {data ? data.withOptimizationLossPercent.toFixed(1) : '—'}
          <span className="ml-1 text-telemetry-md text-muted">% expected loss</span>
        </p>
        <div className="mt-4">
          <AnimatedBar percent={data?.withOptimizationLossPercent ?? 0} colorClassName="bg-status-safe" />
        </div>
        <p className="mt-3 text-body-sm text-muted">Truck rerouted per the optimization engine's recommendation.</p>
      </Card>
    </>
  )
}

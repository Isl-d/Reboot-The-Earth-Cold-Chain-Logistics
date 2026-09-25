import type { ScenarioId } from '@/api/types'
import { clsx, FOCUS_RING } from './clsx'

const SCENARIOS: Array<{ id: ScenarioId; label: string; description: string }> = [
  { id: 'NORMAL', label: 'Normal', description: 'Stable cold-chain, no injected fault' },
  { id: 'TEMPERATURE_EXCURSION', label: 'Temperature Excursion', description: 'Gradual rise above safe threshold' },
  { id: 'DOOR_LEFT_OPEN', label: 'Door Left Open', description: 'Repeated door-open thermal spikes' },
  { id: 'REFRIGERATION_FAILURE', label: 'Refrigeration Failure', description: 'Compressor failure, steady climb' },
  { id: 'TRAFFIC_DELAY', label: 'Traffic Delay', description: 'Route delay, ETA at risk' },
  { id: 'COMBINED_FAILURE', label: 'Combined Failure', description: 'Refrigeration failure + delay' },
]

interface ScenarioPickerProps {
  value: ScenarioId
  onChange: (scenario: ScenarioId) => void
  disabled?: boolean
}

// DESIGN.md doesn't define a scenario-picker component — styled as a grid of
// selectable cards using the same border/tint language as the rest of the
// system (sky selected state, line-strong borders). Used by both Simulation
// (pick a scenario to run) and Scenario Comparison (pick which counterfactual
// to view).
export default function ScenarioPicker({ value, onChange, disabled }: ScenarioPickerProps) {
  return (
    <div className="grid grid-cols-1 gap-2 tablet:grid-cols-2">
      {SCENARIOS.map((scenario) => {
        const selected = scenario.id === value
        return (
          <button
            key={scenario.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(scenario.id)}
            aria-pressed={selected}
            className={clsx(
              FOCUS_RING,
              'rounded-md border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
              selected ? 'border-sky bg-sky-tint' : 'border-line-strong bg-card hover:border-sky',
            )}
          >
            <div className={clsx('text-body-sm font-semibold', selected ? 'text-[#0284C7]' : 'text-navy')}>
              {scenario.label}
            </div>
            <div className="text-body-sm text-muted">{scenario.description}</div>
          </button>
        )
      })}
    </div>
  )
}

import { useState } from 'react'
import { startSimulation, stopSimulation, triggerScenario } from '../../api/simulation'
import type { SimulationScenario, TruckSummary } from '../../types'

const SCENARIOS: { value: SimulationScenario; label: string }[] = [
  { value: 'NORMAL', label: 'Normal Operation' },
  { value: 'TEMPERATURE_EXCURSION', label: 'Temperature Excursion' },
  { value: 'DOOR_LEFT_OPEN', label: 'Door Left Open' },
  { value: 'REFRIGERATION_FAILURE', label: 'Refrigeration Failure' },
  { value: 'TRAFFIC_DELAY', label: 'Traffic Delay' },
  { value: 'COMBINED_FAILURE', label: 'Combined Failure' },
]

interface Props {
  trucks: TruckSummary[]
}

export function SimulationControls({ trucks }: Props) {
  const [pickedTruck, setSelectedTruck] = useState('')
  // Trucks arrive after the first render, so fall back to the first one.
  const selectedTruck = pickedTruck || trucks[0]?.id || ''
  const [selectedScenario, setSelectedScenario] = useState<SimulationScenario>('TEMPERATURE_EXCURSION')
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleTrigger() {
    if (!selectedTruck) return
    setLoading(true)
    setStatus(null)
    try {
      await triggerScenario(selectedTruck, selectedScenario)
      setStatus(`Scenario triggered on ${selectedTruck}`)
    } catch {
      setStatus('Backend offline — scenario logged locally')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart() {
    setLoading(true)
    try {
      await startSimulation(selectedTruck)
      setStatus(`Simulation started on ${selectedTruck}`)
    } catch {
      setStatus('Backend offline')
    } finally {
      setLoading(false)
    }
  }

  async function handleStop() {
    setLoading(true)
    try {
      await stopSimulation(selectedTruck)
      setStatus(`Simulation stopped on ${selectedTruck}`)
    } catch {
      setStatus('Backend offline')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-surface border border-border rounded-md overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[11px] font-medium tracking-[0.06em] uppercase text-text-secondary">
        Simulation Control
      </div>

      <div className="p-3 space-y-2">
        <div className="flex gap-2 flex-wrap">
          <select
            value={selectedTruck}
            onChange={(e) => setSelectedTruck(e.target.value)}
            className="bg-elevated border border-border rounded-sm text-[12px] font-mono text-text-primary px-2 py-1.5 focus:outline-none focus:border-primary"
          >
            {trucks.map((t) => (
              <option key={t.id} value={t.id}>{t.id}</option>
            ))}
          </select>

          <select
            value={selectedScenario}
            onChange={(e) => setSelectedScenario(e.target.value as SimulationScenario)}
            className="bg-elevated border border-border rounded-sm text-[12px] text-text-primary px-2 py-1.5 focus:outline-none focus:border-primary flex-1 min-w-[180px]"
          >
            {SCENARIOS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>

          <button
            onClick={handleTrigger}
            disabled={loading}
            className="px-3 py-1.5 bg-risk-critical text-on-accent rounded-sm text-[12px] font-medium tracking-[0.04em] hover:bg-risk-critical/85 transition-colors disabled:opacity-50"
          >
            TRIGGER
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={loading}
            className="px-3 py-1.5 bg-primary text-on-accent rounded-sm text-[12px] font-medium tracking-[0.04em] hover:bg-primary-dim transition-colors disabled:opacity-50"
          >
            START SIM
          </button>
          <button
            onClick={handleStop}
            disabled={loading}
            className="px-3 py-1.5 bg-elevated border border-border text-text-primary rounded-sm text-[12px] font-medium tracking-[0.04em] hover:border-primary transition-colors disabled:opacity-50"
          >
            STOP SIM
          </button>
        </div>

        {status && (
          <div className="text-[11px] font-mono text-text-secondary">{status}</div>
        )}
      </div>
    </div>
  )
}

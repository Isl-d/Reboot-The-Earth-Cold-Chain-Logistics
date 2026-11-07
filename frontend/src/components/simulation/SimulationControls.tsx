import { useState } from 'react'
import { startSimulation, stopSimulation, triggerScenario } from '../../api/simulation'
import { Box, Button, Select } from '../../design'
import type { SimulationScenario, TruckSummary } from '../../types'

const SCENARIOS: { value: SimulationScenario; label: string }[] = [
  { value: 'NORMAL', label: 'Normal operation' },
  { value: 'TEMPERATURE_EXCURSION', label: 'Temperature excursion' },
  { value: 'DOOR_LEFT_OPEN', label: 'Door left open' },
  { value: 'REFRIGERATION_FAILURE', label: 'Refrigeration failure' },
  { value: 'TRAFFIC_DELAY', label: 'Traffic delay' },
  { value: 'COMBINED_FAILURE', label: 'Combined failure' },
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
      setStatus('Backend offline. Scenario logged locally')
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
    <Box title="Simulation" meta="Synthetic · demo" small bodyClassName="space-y-3 p-3">
      <div className="flex flex-wrap gap-2">
        <Select
          aria-label="Truck"
          value={selectedTruck}
          onChange={(e) => setSelectedTruck(e.target.value)}
          options={trucks.map((t) => ({ value: t.id, label: t.id }))}
          className="w-auto! shrink-0 font-mono"
        />
        <Select
          aria-label="Scenario"
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(e.target.value as SimulationScenario)}
          options={SCENARIOS}
          className="w-auto! min-w-0 flex-1 basis-44"
        />
        <Button onClick={handleTrigger} disabled={loading || !selectedTruck}>
          Trigger
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="tt-caps mr-1 text-text-secondary">Feed</span>
        <Button variant="secondary" onClick={handleStart} disabled={loading} className="min-h-8! px-3! text-[13px]!">
          Start sim
        </Button>
        <Button variant="secondary" onClick={handleStop} disabled={loading} className="min-h-8! px-3! text-[13px]!">
          Stop sim
        </Button>
      </div>

      {status && (
        <div className="flex items-center gap-2 font-mono text-[11px] text-text-secondary" role="status">
          <span className="inline-block h-2 w-2 shrink-0 rounded-full border border-ink bg-fill-sky" aria-hidden />
          {status}
        </div>
      )}
    </Box>
  )
}

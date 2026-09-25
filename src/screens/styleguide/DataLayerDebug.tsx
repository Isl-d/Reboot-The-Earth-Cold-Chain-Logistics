/*
  Dev-only smoke test for Segment 2's data layer: exercises every hook
  through React Query → fetchers → mocks/adapters, end to end. Not a real
  screen — kept here so future segments have a fast way to confirm the data
  layer still works without waiting for the screen that consumes it.
*/
import { useState } from 'react'
import {
  useDeterioration,
  useEvaluateOptimization,
  useFoodLossAnalytics,
  useFoodLossSeries,
  useInventory,
  useLiveSocket,
  useOptimizationCandidates,
  useResetSimulation,
  useScenarioComparison,
  useSpoilagePrediction,
  useStartSimulation,
  useStopSimulation,
  useThermalExposure,
  useTruckTelemetry,
} from '@/api/hooks'
import { Button } from '@/design'

const TRUCK_ID = 'T102'
const BATCH_ID = 'BEF-2031'

function Row({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line py-1 text-body-sm">
      <span className="text-muted">{label}</span>
      <span className="max-w-md truncate font-mono text-navy" title={JSON.stringify(value)}>
        {JSON.stringify(value)}
      </span>
    </div>
  )
}

export default function DataLayerDebug() {
  const [running, setRunning] = useState(false)

  const start = useStartSimulation()
  const stop = useStopSimulation()
  const reset = useResetSimulation()

  const thermalExposure = useThermalExposure(TRUCK_ID, running)
  const deterioration = useDeterioration(TRUCK_ID, running)
  const spoilage = useSpoilagePrediction(TRUCK_ID, running)
  const optimization = useOptimizationCandidates(TRUCK_ID, BATCH_ID)
  const evaluate = useEvaluateOptimization()
  const foodLoss = useFoodLossAnalytics()
  const foodLossSeries = useFoodLossSeries()
  const inventory = useInventory()
  const telemetry = useTruckTelemetry(TRUCK_ID, running)
  const comparison = useScenarioComparison('REFRIGERATION_FAILURE')
  const live = useLiveSocket()

  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex flex-wrap gap-2">
        <Button
          onClick={() => {
            start.mutate({ truckId: TRUCK_ID, scenario: 'REFRIGERATION_FAILURE', speedMultiplier: 30 })
            setRunning(true)
          }}
        >
          Start REFRIGERATION_FAILURE
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            stop.mutate(TRUCK_ID)
            setRunning(false)
          }}
        >
          Stop
        </Button>
        <Button
          variant="destructive"
          onClick={() => {
            reset.mutate(TRUCK_ID)
            setRunning(false)
          }}
        >
          Reset
        </Button>
        <Button variant="secondary" onClick={() => evaluate.mutate({ truckId: TRUCK_ID, batchId: BATCH_ID })}>
          Evaluate optimization
        </Button>
      </div>

      <Row label="thermalExposure.status" value={thermalExposure.status} />
      <Row label="thermalExposure.data" value={thermalExposure.data} />
      <Row label="deterioration.data" value={deterioration.data} />
      <Row label="spoilage.data" value={spoilage.data} />
      <Row label="optimization.data" value={optimization.data} />
      <Row label="evaluate.data" value={evaluate.data} />
      <Row label="foodLoss.data" value={foodLoss.data} />
      <Row label="foodLossSeries.data.byCause" value={foodLossSeries.data?.byCause} />
      <Row label="inventory.data.length" value={inventory.data?.length} />
      <Row label="telemetry.data.length" value={telemetry.data?.length} />
      <Row label="comparison.data" value={comparison.data} />
      <Row label="live.status" value={live.status} />
      <Row label="live.samplesByTruck" value={live.samplesByTruck} />
    </div>
  )
}

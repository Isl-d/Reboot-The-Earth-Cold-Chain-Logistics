import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import type { ScenarioId } from '../dto'
import { fetchResetSimulation, fetchSimulationState, fetchStartSimulation, fetchStopSimulation } from '../fetchers'

export const simulationKey = (truckId: string) => ['simulation', truckId] as const

// Telemetry and the model chain (thermal exposure, deterioration, spoilage —
// see useModel.ts / useTelemetry.ts) are keyed by truckId alone, so a Reset
// or a fresh Start would otherwise leave the PREVIOUS run's cached values on
// screen until the next poll. Stop deliberately does NOT clear these — it's
// meant to freeze the last known values, not blank them.
function clearDerivedCaches(queryClient: QueryClient, truckId: string) {
  for (const key of ['telemetry', 'thermalExposure', 'deterioration', 'spoilagePrediction']) {
    queryClient.removeQueries({ queryKey: [key, truckId] })
  }
}

/** Polls the current simulation state for a truck — cheap enough to always poll, unlike the model/telemetry queries. */
export function useSimulationState(truckId: string) {
  return useQuery({
    queryKey: simulationKey(truckId),
    queryFn: () => fetchSimulationState(truckId),
    enabled: Boolean(truckId),
    refetchInterval: 2000,
  })
}

interface StartParams {
  truckId: string
  scenario: ScenarioId
  speedMultiplier: number
}

export function useStartSimulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: StartParams) => fetchStartSimulation(params),
    onSuccess: (state) => {
      queryClient.setQueryData(simulationKey(state.truckId), state)
      clearDerivedCaches(queryClient, state.truckId)
    },
  })
}

export function useStopSimulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (truckId: string) => fetchStopSimulation(truckId),
    onSuccess: (state) => queryClient.setQueryData(simulationKey(state.truckId), state),
  })
}

export function useResetSimulation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (truckId: string) => fetchResetSimulation(truckId),
    onSuccess: (state) => {
      queryClient.setQueryData(simulationKey(state.truckId), state)
      clearDerivedCaches(queryClient, state.truckId)
    },
  })
}

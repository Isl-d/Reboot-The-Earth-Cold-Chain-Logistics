import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ScenarioId } from '../dto'
import { fetchResetSimulation, fetchSimulationState, fetchStartSimulation, fetchStopSimulation } from '../fetchers'

export const simulationKey = (truckId: string) => ['simulation', truckId] as const

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
    onSuccess: (state) => queryClient.setQueryData(simulationKey(state.truckId), state),
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
    onSuccess: (state) => queryClient.setQueryData(simulationKey(state.truckId), state),
  })
}

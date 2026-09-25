import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchDeterioration, fetchExplain, fetchSpoilagePrediction, fetchSystem1, fetchThermalExposure } from '../fetchers'

// The chain (Sensor data → thermal exposure → deterioration → spoilage → risk)
// only needs to keep polling while a simulation is actually running.
const POLL_MS = 2000

export function useThermalExposure(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['thermalExposure', truckId],
    queryFn: () => fetchThermalExposure(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : false,
  })
}

export function useDeterioration(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['deterioration', truckId],
    queryFn: () => fetchDeterioration(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : false,
  })
}

export function useSpoilagePrediction(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['spoilagePrediction', truckId],
    queryFn: () => fetchSpoilagePrediction(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : false,
  })
}

// Laya answers in one forward pass, so it can be polled with the rest of the
// chain. Errors are swallowed by the adapter into `available: false`.
export function useSystem1(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['system1', truckId],
    queryFn: () => fetchSystem1(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : false,
    retry: false,
  })
}

// On demand only: the grounded explanation costs a frontier-model call, so it
// runs when the operator asks, not on a poll.
export function useExplain() {
  return useMutation({
    mutationFn: ({ truckId, question }: { truckId: string; question?: string }) =>
      fetchExplain(truckId, question),
  })
}

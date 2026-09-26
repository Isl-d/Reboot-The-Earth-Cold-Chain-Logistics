import { useMutation, useQuery } from '@tanstack/react-query'
import { fetchDeterioration, fetchExplain, fetchSpoilagePrediction, fetchSystem1, fetchThermalExposure } from '../fetchers'

// The chain (Sensor data → thermal exposure → deterioration → spoilage → risk)
// polls fast while a UI-started simulation runs. The fleet simulator streams
// readings continuously even without one, so it never stops polling — it only
// slows down; otherwise the charts froze until a page refresh.
export const POLL_MS = 2000
export const IDLE_POLL_MS = 5000

export function useThermalExposure(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['thermalExposure', truckId],
    queryFn: () => fetchThermalExposure(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : IDLE_POLL_MS,
  })
}

export function useDeterioration(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['deterioration', truckId],
    queryFn: () => fetchDeterioration(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : IDLE_POLL_MS,
  })
}

export function useSpoilagePrediction(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['spoilagePrediction', truckId],
    queryFn: () => fetchSpoilagePrediction(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : IDLE_POLL_MS,
  })
}

// Laya answers in one forward pass, so it can be polled with the rest of the
// chain. Errors are swallowed by the adapter into `available: false`.
// System 1 runs a local model on CPU (~5-10 s per call), so it is polled far
// less often than the deterministic chain, and the backend caches it for 10 s.
const SYSTEM1_POLL_MS = 20_000
const SYSTEM1_IDLE_POLL_MS = 60_000

export function useSystem1(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['system1', truckId],
    queryFn: () => fetchSystem1(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? SYSTEM1_POLL_MS : SYSTEM1_IDLE_POLL_MS,
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

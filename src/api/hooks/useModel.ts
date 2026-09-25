import { useQuery } from '@tanstack/react-query'
import { fetchDeterioration, fetchSpoilagePrediction, fetchThermalExposure } from '../fetchers'

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

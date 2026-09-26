import { useQuery } from '@tanstack/react-query'
import { fetchTruckTelemetry } from '../fetchers'
import { IDLE_POLL_MS, POLL_MS } from './useModel'

export function useTruckTelemetry(truckId: string, running: boolean) {
  return useQuery({
    // Namespaced distinctly from the command-center hook's ['telemetry', id]
    // (different response shape — TelemetrySample vs TelemetryPoint) so the two
    // can never serve each other's cached data when navigating between routes.
    queryKey: ['intelTelemetry', truckId],
    queryFn: () => fetchTruckTelemetry(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? POLL_MS : IDLE_POLL_MS,
  })
}

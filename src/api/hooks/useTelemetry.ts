import { useQuery } from '@tanstack/react-query'
import { fetchTruckTelemetry } from '../fetchers'

export function useTruckTelemetry(truckId: string, running: boolean) {
  return useQuery({
    queryKey: ['telemetry', truckId],
    queryFn: () => fetchTruckTelemetry(truckId),
    enabled: Boolean(truckId),
    refetchInterval: running ? 2000 : false,
  })
}

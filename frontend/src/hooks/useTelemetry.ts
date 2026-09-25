import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '../api/client'
import { getTelemetry } from '../api/trucks'
import { MOCK_TELEMETRY } from '../mocks/data'

export function useTelemetry(id: string) {
  return useQuery({
    queryKey: ['telemetry', id],
    queryFn: () => {
      if (USE_MOCKS) return Promise.resolve(MOCK_TELEMETRY)
      const to = new Date().toISOString()
      const from = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      return getTelemetry(id, from, to)
    },
    refetchInterval: 30_000,
    enabled: !!id,
  })
}

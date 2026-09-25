import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '../api/client'
import { getIncidents } from '../api/incidents'
import { MOCK_INCIDENTS } from '../mocks/data'

export function useIncidents() {
  return useQuery({
    queryKey: ['incidents'],
    queryFn: () => (USE_MOCKS ? Promise.resolve(MOCK_INCIDENTS) : getIncidents()),
    refetchInterval: 15_000,
  })
}

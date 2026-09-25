import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '../api/client'
import { getTrucks } from '../api/trucks'
import { MOCK_TRUCKS } from '../mocks/data'

// Mocks only when VITE_USE_MOCKS=true; a failed request stays an error rather
// than silently rendering synthetic trucks as live data.
export function useTrucks() {
  return useQuery({
    queryKey: ['trucks'],
    queryFn: () => (USE_MOCKS ? Promise.resolve(MOCK_TRUCKS) : getTrucks()),
    refetchInterval: 10_000,
  })
}

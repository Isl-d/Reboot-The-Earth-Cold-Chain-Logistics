import { useQuery } from '@tanstack/react-query'
import { USE_MOCKS } from '../api/client'
import { getTruck } from '../api/trucks'
import { MOCK_TRUCK_DETAIL } from '../mocks/data'

export function useTruckDetail(id: string) {
  return useQuery({
    queryKey: ['truck', id],
    queryFn: () => (USE_MOCKS ? Promise.resolve(MOCK_TRUCK_DETAIL) : getTruck(id)),
    refetchInterval: 5_000,
    enabled: !!id,
  })
}

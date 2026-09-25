import { useQuery } from '@tanstack/react-query'
import { fetchSimTruckOptions } from '../fetchers'

export function useSimTruckOptions() {
  return useQuery({ queryKey: ['simTruckOptions'], queryFn: fetchSimTruckOptions })
}

import { useQuery } from '@tanstack/react-query'
import { fetchFoodLossAnalytics, fetchFoodLossSeries } from '../fetchers'

export function useFoodLossAnalytics() {
  return useQuery({ queryKey: ['foodLossAnalytics'], queryFn: fetchFoodLossAnalytics })
}

export function useFoodLossSeries() {
  return useQuery({ queryKey: ['foodLossSeries'], queryFn: fetchFoodLossSeries })
}

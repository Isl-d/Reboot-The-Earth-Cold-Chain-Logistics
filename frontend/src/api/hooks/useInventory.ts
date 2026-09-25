import { useQuery } from '@tanstack/react-query'
import { fetchInventory } from '../fetchers'

export function useInventory() {
  return useQuery({ queryKey: ['inventory'], queryFn: fetchInventory })
}

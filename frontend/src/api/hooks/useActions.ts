import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { executeAction, listActions, runAutoPilot, type ActionInput } from '../actions'

export function useActions(truckId?: string, enabled = true) {
  return useQuery({
    queryKey: ['actions', truckId ?? 'all'],
    queryFn: () => listActions(truckId),
    enabled,
    refetchInterval: 10_000,
  })
}

export function useExecuteAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ActionInput) => executeAction(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })
}

export function useAutoPilot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (truckId: string) => runAutoPilot(truckId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['actions'] }),
  })
}
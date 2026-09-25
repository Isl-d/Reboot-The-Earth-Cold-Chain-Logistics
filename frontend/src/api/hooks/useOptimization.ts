import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchEvaluateOptimization, fetchOptimizationCandidates } from '../fetchers'

const optimizationKey = (truckId: string, batchId: string) => ['optimization', truckId, batchId] as const

export function useOptimizationCandidates(truckId: string, batchId: string) {
  return useQuery({
    queryKey: optimizationKey(truckId, batchId),
    queryFn: () => fetchOptimizationCandidates(truckId, batchId),
    enabled: Boolean(truckId && batchId),
  })
}

interface EvaluateParams {
  truckId: string
  batchId: string
}

/** POST /api/optimization/evaluate — e.g. Inventory's "Evaluate options" row action. */
export function useEvaluateOptimization() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: EvaluateParams) => fetchEvaluateOptimization(params),
    onSuccess: (result, params) => {
      queryClient.setQueryData(optimizationKey(params.truckId, params.batchId), result)
    },
  })
}

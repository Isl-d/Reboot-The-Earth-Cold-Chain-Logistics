import { useQuery } from '@tanstack/react-query'
import type { ScenarioId } from '../dto'
import { fetchScenarioComparison } from '../fetchers'

export function useScenarioComparison(scenario: ScenarioId) {
  return useQuery({
    queryKey: ['scenarioComparison', scenario],
    queryFn: () => fetchScenarioComparison(scenario),
  })
}

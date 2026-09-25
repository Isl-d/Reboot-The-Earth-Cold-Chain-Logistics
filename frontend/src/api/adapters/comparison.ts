import type { ScenarioComparisonDto } from '../dto'
import type { ScenarioComparison } from '../types'
import { expectNumber } from '../validation'

export function adaptScenarioComparison(dto: ScenarioComparisonDto): ScenarioComparison {
  const resource = 'scenario comparison'
  return {
    scenario: dto.scenario,
    withoutInterventionLossPercent: expectNumber(resource, 'withoutInterventionLossPercent', dto.withoutInterventionLossPercent),
    withOptimizationLossPercent: expectNumber(resource, 'withOptimizationLossPercent', dto.withOptimizationLossPercent),
    foodSavedKg: expectNumber(resource, 'foodSavedKg', dto.foodSavedKg),
    financialSavedQar: expectNumber(resource, 'financialSavedQar', dto.financialSavedQar),
  }
}

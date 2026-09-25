import type { FoodLossAnalyticsDto, FoodLossBreakdownItemDto, FoodLossSeriesDto, FoodLossTimePointDto } from '../dto'
import type { FoodLossAnalytics, FoodLossBreakdownItem, FoodLossSeries, FoodLossTimePoint } from '../types'
import { expectArray, expectNumber, expectString } from '../validation'

export function adaptFoodLossAnalytics(dto: FoodLossAnalyticsDto): FoodLossAnalytics {
  const resource = 'food-loss analytics'
  return {
    period: expectString(resource, 'period', dto.period),
    transportedKg: expectNumber(resource, 'transportedKg', dto.transportedKg),
    atRiskKg: expectNumber(resource, 'atRiskKg', dto.atRiskKg),
    lostKg: expectNumber(resource, 'lostKg', dto.lostKg),
    savedKg: expectNumber(resource, 'savedKg', dto.savedKg),
    lossRatePercent: expectNumber(resource, 'lossRatePercent', dto.lossRatePercent),
    preventedLossPercent: expectNumber(resource, 'preventedLossPercent', dto.preventedLossPercent),
    estimatedFinancialLoss: expectNumber(resource, 'estimatedFinancialLoss', dto.estimatedFinancialLoss),
    estimatedFinancialLossPrevented: expectNumber(
      resource,
      'estimatedFinancialLossPrevented',
      dto.estimatedFinancialLossPrevented,
    ),
    // Optional — docs/PIPELINE.md Food Loss Engine output, absent from the spec's own example JSON.
    co2AvoidedKg: typeof dto.co2AvoidedKg === 'number' ? dto.co2AvoidedKg : undefined,
  }
}

function adaptTimePoint(dto: FoodLossTimePointDto): FoodLossTimePoint {
  const resource = 'food-loss time point'
  return {
    dateMs: Date.parse(expectString(resource, 'date', dto.date)),
    lostKg: expectNumber(resource, 'lostKg', dto.lostKg),
    predictedLostKg: expectNumber(resource, 'predictedLostKg', dto.predictedLostKg),
  }
}

function adaptBreakdownItem(dto: FoodLossBreakdownItemDto): FoodLossBreakdownItem {
  const resource = 'food-loss breakdown item'
  return {
    label: expectString(resource, 'label', dto.label),
    lostKg: expectNumber(resource, 'lostKg', dto.lostKg),
  }
}

export function adaptFoodLossSeries(dto: FoodLossSeriesDto): FoodLossSeries {
  const resource = 'food-loss series'
  return {
    overTime: expectArray<FoodLossTimePointDto>(resource, 'overTime', dto.overTime).map(adaptTimePoint),
    byCause: expectArray<FoodLossBreakdownItemDto>(resource, 'byCause', dto.byCause).map(adaptBreakdownItem),
    byProduct: expectArray<FoodLossBreakdownItemDto>(resource, 'byProduct', dto.byProduct).map(adaptBreakdownItem),
    byWarehouse: expectArray<FoodLossBreakdownItemDto>(resource, 'byWarehouse', dto.byWarehouse).map(adaptBreakdownItem),
  }
}

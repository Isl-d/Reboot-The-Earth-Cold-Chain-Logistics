/*
  Mock backend — every function here returns DTO-shaped data (src/api/dto.ts)
  and is called only from src/api/fetchers.ts when VITE_USE_MOCKS=true, then
  piped through the same adapters the real backend's responses go through.
  Screens never import from here.
*/

import type {
  FoodLossAnalyticsDto,
  FoodLossSeriesDto,
  InventoryBatchDto,
  OptimizationCandidateDto,
  OptimizationResultDto,
  ScenarioComparisonDto,
  ScenarioId,
  SimulationStartRequestDto,
  SimulationStateDto,
  TelemetrySampleDto,
} from '../api/dto'
import { BATCHES, findBatch, findTruck, STORES, WAREHOUSES } from './fixtures'
import {
  deteriorationFractionAt,
  delayMinutesAt,
  doorOpenAt,
  humidityAt,
  integrateThermalExposure,
  remainingShelfLifeHoursAt,
  spoilageProbabilityAt,
  temperatureAt,
  SAFE_TEMPERATURE_C,
} from './scenarioEngine'
import { seededRange } from './seededRandom'
import { mockSimulationStore } from './store'

// ---- Simulation -----------------------------------------------------------

export async function startSimulation(req: SimulationStartRequestDto): Promise<SimulationStateDto> {
  const state = mockSimulationStore.start(req.truckId, req.scenario, req.speedMultiplier)
  return toSimulationStateDto(state.truckId)
}

export async function stopSimulation(truckId: string): Promise<SimulationStateDto> {
  mockSimulationStore.stop(truckId)
  return toSimulationStateDto(truckId)
}

export async function resetSimulation(truckId: string): Promise<SimulationStateDto> {
  mockSimulationStore.reset(truckId)
  return toSimulationStateDto(truckId)
}

export async function getSimulationState(truckId: string): Promise<SimulationStateDto> {
  return toSimulationStateDto(truckId)
}

function toSimulationStateDto(truckId: string): SimulationStateDto {
  const state = mockSimulationStore.get(truckId)
  return {
    truckId,
    batchId: state?.batchId ?? findTruck(truckId)?.batchId ?? BATCHES[0].id,
    scenario: state?.scenario ?? 'NORMAL',
    speedMultiplier: state?.speedMultiplier ?? 1,
    running: state?.running ?? false,
    startedAt: new Date(state?.startedAtMs ?? Date.now()).toISOString(),
  }
}

// ---- Mathematical model ----------------------------------------------------

function currentSnapshot(truckId: string) {
  const state = mockSimulationStore.get(truckId)
  const scenario: ScenarioId = state?.scenario ?? 'NORMAL'
  const simMinutes = mockSimulationStore.elapsedSimMinutes(truckId)
  const currentTemperatureC = temperatureAt(scenario, simMinutes)
  const exposure = integrateThermalExposure(scenario, simMinutes)
  const deteriorationFraction = deteriorationFractionAt(exposure)
  const remainingShelfLifeHours = remainingShelfLifeHoursAt(deteriorationFraction)
  const spoilageProbability = spoilageProbabilityAt(deteriorationFraction)
  return { scenario, simMinutes, currentTemperatureC, exposure, deteriorationFraction, remainingShelfLifeHours, spoilageProbability }
}

export async function getThermalExposure(truckId: string) {
  const { simMinutes, currentTemperatureC, exposure } = currentSnapshot(truckId)
  return {
    safeTemperatureC: SAFE_TEMPERATURE_C,
    currentTemperatureC: Math.round(currentTemperatureC * 10) / 10,
    exposureMinutes: Math.round(simMinutes * 10) / 10,
    thermalExposure: Math.round(exposure * 10) / 10,
    unit: 'C*min',
  }
}

export async function getDeterioration(truckId: string) {
  const { deteriorationFraction, remainingShelfLifeHours } = currentSnapshot(truckId)
  return {
    deteriorationFraction: Math.round(deteriorationFraction * 1000) / 1000,
    remainingShelfLifeHours: Math.round(remainingShelfLifeHours * 10) / 10,
    confidence: 0.91,
  }
}

export async function getSpoilagePrediction(truckId: string) {
  const { spoilageProbability } = currentSnapshot(truckId)
  return {
    spoilageProbability: Math.round(spoilageProbability * 1000) / 1000,
    confidence: 0.91,
    modelVersion: 'mock-1',
  }
}

// ---- Optimization -----------------------------------------------------------

function computeOptimizationResult(truckId: string, batchId: string): OptimizationResultDto {
  const { remainingShelfLifeHours, spoilageProbability, scenario, simMinutes } = currentSnapshot(truckId)
  const remainingMinutes = remainingShelfLifeHours * 60
  const quantityKg = findBatch(batchId)?.quantityKg ?? 300
  const severity = spoilageProbability

  const candidates: OptimizationCandidateDto[] = WAREHOUSES.map((wh) => {
    const key = `${truckId}:${wh.id}`
    const etaMinutes = Math.round(
      Math.max(5, wh.baseEtaMinutes + delayMinutesAt(scenario, simMinutes) + seededRange(`${key}:eta`, -2, 4)),
    )
    const transportCost = Math.round(Math.max(20, wh.baseTransportCost + seededRange(`${key}:cost`, -8, 12)))
    const distancePenalty = etaMinutes / 10
    const expectedLossPercent =
      Math.round(Math.max(0.5, severity * 12 + distancePenalty + seededRange(`${key}:loss`, -0.5, 1.5)) * 10) / 10
    const feasible = wh.temperatureCompatible && wh.capacityKg >= quantityKg && etaMinutes <= remainingMinutes
    return {
      warehouseId: wh.id,
      etaMinutes,
      capacityKg: wh.capacityKg,
      temperatureCompatible: wh.temperatureCompatible,
      expectedLossPercent,
      transportCost,
      feasible,
    }
  })

  const pool = candidates.some((c) => c.feasible) ? candidates.filter((c) => c.feasible) : candidates
  const scored = pool.map((c) => ({ c, score: c.transportCost * 0.4 + c.expectedLossPercent * 15 + c.etaMinutes * 1.2 }))
  scored.sort((a, b) => a.score - b.score)
  const best = scored[0].c
  const maxScore = Math.max(...scored.map((s) => s.score), 1)

  return {
    candidates,
    selectedWarehouseId: best.warehouseId,
    objectiveValue: Math.round((scored[0].score / maxScore) * 100) / 100,
  }
}

export async function getOptimizationCandidates(truckId: string, batchId: string): Promise<OptimizationResultDto> {
  return computeOptimizationResult(truckId, batchId)
}

// The spec's GET (read candidates) and POST evaluate (§ "Data you send") ask
// the optimizer the same question today, so this simply delegates — a future
// backend that makes evaluate re-run with different inputs can diverge here.
export const evaluateOptimization = getOptimizationCandidates

// ---- Food-loss analytics -----------------------------------------------------

export async function getFoodLossAnalytics(): Promise<FoodLossAnalyticsDto> {
  const period = new Date().toISOString().slice(0, 7)
  return {
    period,
    transportedKg: 12450,
    atRiskKg: 1240,
    lostKg: 380,
    savedKg: 860,
    lossRatePercent: 3.05,
    preventedLossPercent: 69.35,
    estimatedFinancialLoss: 4200,
    estimatedFinancialLossPrevented: 9800,
    co2AvoidedKg: 612,
  }
}

const CAUSES = ['Refrigeration Failure', 'Door Left Open', 'Traffic Delay', 'Temperature Excursion']

export async function getFoodLossSeries(): Promise<FoodLossSeriesDto> {
  const today = Date.now()
  const overTime = Array.from({ length: 14 }, (_, i) => {
    const dayMs = today - (13 - i) * 24 * 60 * 60 * 1000
    const lostKg = Math.round(20 + seededRange(`series:day:${i}`, 0, 25))
    return {
      date: new Date(dayMs).toISOString(),
      lostKg,
      predictedLostKg: Math.round(lostKg * seededRange(`series:pred:${i}`, 0.85, 1.15)),
    }
  })
  const byCause = CAUSES.map((label, i) => ({ label, lostKg: Math.round(seededRange(`cause:${i}`, 40, 140)) }))
  const byProduct = BATCHES.map((b, i) => ({ label: b.product, lostKg: Math.round(seededRange(`product:${i}`, 20, 100)) }))
  const byWarehouse = WAREHOUSES.map((w, i) => ({ label: w.label, lostKg: Math.round(seededRange(`wh:${i}`, 15, 90)) }))
  return { overTime, byCause, byProduct, byWarehouse }
}

// ---- Inventory -----------------------------------------------------------

export async function getInventory(): Promise<InventoryBatchDto[]> {
  const recommendations = ['CONTINUE', 'TRANSFER', 'DISCOUNT', 'PRIORITIZE_SALE', 'REDISTRIBUTE'] as const
  return BATCHES.map((batch, i) => {
    const spoilageProbability = Math.round(seededRange(`inv:${batch.id}:risk`, 0.05, 0.85) * 100) / 100
    const predictedDemandKg = Math.round(batch.quantityKg * seededRange(`inv:${batch.id}:demand`, 0.35, 0.75))
    const expiryDays = Math.round(seededRange(`inv:${batch.id}:expiry`, 1, 6))
    return {
      batchId: batch.id,
      product: batch.product,
      locationId: STORES[i % STORES.length].id,
      quantityKg: batch.quantityKg,
      expiryDate: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      predictedDemandKg,
      expectedExcessKg: Math.max(0, batch.quantityKg - predictedDemandKg),
      spoilageProbability,
      recommendation: recommendations[Math.floor(seededRange(`inv:${batch.id}:rec`, 0, recommendations.length))],
    }
  })
}

// ---- Telemetry -----------------------------------------------------------

export async function getTruckTelemetry(truckId: string): Promise<TelemetrySampleDto[]> {
  const state = mockSimulationStore.get(truckId)
  const scenario: ScenarioId = state?.scenario ?? 'NORMAL'
  const simMinutes = mockSimulationStore.elapsedSimMinutes(truckId)
  const points = Math.min(60, Math.max(1, Math.ceil(simMinutes)))
  const startedAtMs = state?.startedAtMs ?? Date.now()
  return Array.from({ length: points }, (_, i) => {
    const t = (simMinutes / points) * (i + 1)
    return {
      timestamp: new Date(startedAtMs + t * 60_000).toISOString(),
      temperatureC: Math.round(temperatureAt(scenario, t) * 10) / 10,
      humidityPercent: Math.round(humidityAt(scenario, t)),
      doorOpen: doorOpenAt(scenario, t),
    }
  })
}

// ---- Scenario comparison -----------------------------------------------------

const COMPARISON_BASELINES: Record<ScenarioId, { without: number; with: number; savedKg: number }> = {
  NORMAL: { without: 3, with: 1, savedKg: 12 },
  TEMPERATURE_EXCURSION: { without: 18, with: 3, savedKg: 45 },
  DOOR_LEFT_OPEN: { without: 22, with: 5, savedKg: 58 },
  REFRIGERATION_FAILURE: { without: 31, with: 4, savedKg: 82 },
  TRAFFIC_DELAY: { without: 12, with: 3, savedKg: 30 },
  COMBINED_FAILURE: { without: 42, with: 6, savedKg: 110 },
}

export async function getScenarioComparison(scenario: ScenarioId): Promise<ScenarioComparisonDto> {
  const baseline = COMPARISON_BASELINES[scenario]
  return {
    scenario,
    withoutInterventionLossPercent: baseline.without,
    withOptimizationLossPercent: baseline.with,
    foodSavedKg: baseline.savedKg,
    financialSavedQar: Math.round(baseline.savedKg * 21.5),
  }
}

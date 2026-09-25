/*
  One async function per resource. Each branches on USE_MOCKS, then pipes
  whichever DTO it got (real axios response or mock generator) through the
  same adapter — so the mock path exercises exactly the code a real backend
  response would. This is the only file that branches; hooks and screens
  never check USE_MOCKS themselves.
*/

import {
  adaptDeterioration,
  adaptExplain,
  adaptFoodLossAnalytics,
  adaptFoodLossSeries,
  adaptInventoryBatch,
  adaptOptimizationResult,
  adaptScenarioComparison,
  adaptSimTruckOption,
  adaptSimulationState,
  adaptSpoilagePrediction,
  adaptSystem1,
  adaptTelemetrySample,
  adaptThermalExposure,
} from './adapters'
import { apiClient, USE_MOCKS } from './client'
import type {
  DeteriorationDto,
  ExplainDto,
  FoodLossAnalyticsDto,
  FoodLossSeriesDto,
  InventoryBatchDto,
  OptimizationEvaluateRequestDto,
  OptimizationResultDto,
  ScenarioComparisonDto,
  ScenarioId,
  SimTruckOptionDto,
  SimulationStartRequestDto,
  SimulationStateDto,
  SpoilagePredictionDto,
  System1Dto,
  TelemetrySampleDto,
  ThermalExposureDto,
} from './dto'
import { endpoints } from './endpoints'
import * as mock from '../mocks/handlers'
import type {
  Deterioration,
  ExplainResult,
  FoodLossAnalytics,
  FoodLossSeries,
  InventoryBatch,
  OptimizationResult,
  ScenarioComparison,
  SimTruckOption,
  SimulationState,
  SpoilagePrediction,
  System1Decision,
  ThermalExposure,
} from './types'

// ---- Trucks (picklist metadata) --------------------------------------------

export async function fetchSimTruckOptions(): Promise<SimTruckOption[]> {
  const dtos = USE_MOCKS
    ? await mock.getSimTruckOptions()
    : (await apiClient.get<{ trucks: SimTruckOptionDto[] }>(endpoints.trucks)).data.trucks
  return dtos.map(adaptSimTruckOption)
}

// ---- Simulation -----------------------------------------------------------

export async function fetchStartSimulation(req: SimulationStartRequestDto): Promise<SimulationState> {
  const dto = USE_MOCKS
    ? await mock.startSimulation(req)
    : (await apiClient.post<SimulationStateDto>(endpoints.simulationStart, req)).data
  return adaptSimulationState(dto)
}

export async function fetchStopSimulation(truckId: string): Promise<SimulationState> {
  const dto = USE_MOCKS
    ? await mock.stopSimulation(truckId)
    : (await apiClient.post<SimulationStateDto>(endpoints.simulationStop, { truckId })).data
  return adaptSimulationState(dto)
}

export async function fetchResetSimulation(truckId: string): Promise<SimulationState> {
  const dto = USE_MOCKS
    ? await mock.resetSimulation(truckId)
    : (await apiClient.post<SimulationStateDto>(endpoints.simulationReset, { truckId })).data
  return adaptSimulationState(dto)
}

export async function fetchSimulationState(truckId: string): Promise<SimulationState> {
  const dto = USE_MOCKS
    ? await mock.getSimulationState(truckId)
    : (await apiClient.get<SimulationStateDto>(endpoints.simulationState(truckId))).data
  return adaptSimulationState(dto)
}

// ---- Mathematical model ----------------------------------------------------

export async function fetchThermalExposure(truckId: string): Promise<ThermalExposure> {
  const dto = USE_MOCKS
    ? await mock.getThermalExposure(truckId)
    : (await apiClient.get<ThermalExposureDto>(endpoints.thermalExposure(truckId))).data
  return adaptThermalExposure(dto)
}

export async function fetchDeterioration(truckId: string): Promise<Deterioration> {
  const dto = USE_MOCKS
    ? await mock.getDeterioration(truckId)
    : (await apiClient.get<DeteriorationDto>(endpoints.deterioration(truckId))).data
  return adaptDeterioration(dto)
}

export async function fetchSpoilagePrediction(truckId: string): Promise<SpoilagePrediction> {
  const dto = USE_MOCKS
    ? await mock.getSpoilagePrediction(truckId)
    : (await apiClient.get<SpoilagePredictionDto>(endpoints.spoilagePrediction(truckId))).data
  return adaptSpoilagePrediction(dto)
}

// ---- System 1 (Laya, local) -------------------------------------------------
// Always hits the real backend; mocks are not provided for a model we run locally.
export async function fetchSystem1(truckId: string): Promise<System1Decision> {
  const dto = await apiClient.get<System1Dto>(endpoints.system1(truckId)).then((r) => r.data)
  return adaptSystem1(dto)
}

// ---- Grounded explanation (System 1 routing/guardrails + System 2 prose) -----
export async function fetchExplain(truckId: string, question?: string): Promise<ExplainResult> {
  const dto = (await apiClient.post<ExplainDto>(endpoints.explain, { truckId, question })).data
  return adaptExplain(dto)
}

// ---- Optimization -----------------------------------------------------------

export async function fetchOptimizationCandidates(truckId: string, batchId: string): Promise<OptimizationResult> {
  const dto = USE_MOCKS
    ? await mock.getOptimizationCandidates(truckId, batchId)
    // GET wraps the result as { batchId, truckId, optimization } (API_CONTRACT §4.4);
    // only POST /evaluate returns the bare optimization object.
    : (await apiClient.get<{ optimization: OptimizationResultDto }>(endpoints.optimizationCandidates(batchId))).data.optimization
  return adaptOptimizationResult(dto)
}

export async function fetchEvaluateOptimization(req: OptimizationEvaluateRequestDto): Promise<OptimizationResult> {
  const dto = USE_MOCKS
    ? await mock.evaluateOptimization(req.truckId, req.batchId)
    : (await apiClient.post<OptimizationResultDto>(endpoints.optimizationEvaluate, req)).data
  return adaptOptimizationResult(dto)
}

// ---- Food-loss analytics -----------------------------------------------------

export async function fetchFoodLossAnalytics(): Promise<FoodLossAnalytics> {
  const dto = USE_MOCKS
    ? await mock.getFoodLossAnalytics()
    : (await apiClient.get<FoodLossAnalyticsDto>(endpoints.foodLossAnalytics)).data
  return adaptFoodLossAnalytics(dto)
}

export async function fetchFoodLossSeries(): Promise<FoodLossSeries> {
  const dto = USE_MOCKS
    ? await mock.getFoodLossSeries()
    : (await apiClient.get<FoodLossSeriesDto>(endpoints.foodLossSeries)).data
  return adaptFoodLossSeries(dto)
}

// ---- Inventory -----------------------------------------------------------

export async function fetchInventory(): Promise<InventoryBatch[]> {
  const dtos = USE_MOCKS
    ? await mock.getInventory()
    : (await apiClient.get<{ inventory: InventoryBatchDto[] }>(endpoints.inventory)).data.inventory
  return dtos.map(adaptInventoryBatch)
}

// ---- Telemetry -----------------------------------------------------------

export async function fetchTruckTelemetry(truckId: string) {
  const dtos = USE_MOCKS
    ? await mock.getTruckTelemetry(truckId)
    : (await apiClient.get<TelemetrySampleDto[]>(endpoints.truckTelemetry(truckId))).data
  return dtos.map(adaptTelemetrySample)
}

// ---- Scenario comparison -----------------------------------------------------

export async function fetchScenarioComparison(scenario: ScenarioId): Promise<ScenarioComparison> {
  const dto = USE_MOCKS
    ? await mock.getScenarioComparison(scenario)
    : (await apiClient.get<ScenarioComparisonDto>(endpoints.scenarioComparison(scenario))).data
  return adaptScenarioComparison(dto)
}

// ---- GIS / Fleet map --------------------------------------------------------

export async function fetchRoutesGeoJson(): Promise<GeoJSON.FeatureCollection> {
  if (USE_MOCKS) return mock.getRoutesGeoJson()
  return (await apiClient.get<GeoJSON.FeatureCollection>(endpoints.routesGeoJson)).data
}

export interface TruckPositionDto {
  truckId: string
  name: string
  lat: number
  lon: number
  temperatureC?: number
  speedKmh?: number
  risk?: string
  product?: string
}

export async function fetchAllTruckPositions(): Promise<TruckPositionDto[]> {
  if (USE_MOCKS) return mock.getAllTruckPositions()
  const dtos = (await apiClient.get<{ trucks: Array<Record<string, unknown>> }>(endpoints.trucks)).data.trucks
  return dtos.map((t) => ({
    truckId: String(t.id),
    name: String(t.name ?? t.id),
    lat: Number(t.latitude),
    lon: Number(t.longitude),
    temperatureC: t.temperatureC as number | undefined,
    speedKmh: t.speedKmh as number | undefined,
    risk: t.riskLevel as string | undefined,
    product: t.product as string | undefined,
  }))
}

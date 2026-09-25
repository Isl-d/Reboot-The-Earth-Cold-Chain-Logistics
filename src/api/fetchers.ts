/*
  One async function per resource. Each branches on USE_MOCKS, then pipes
  whichever DTO it got (real axios response or mock generator) through the
  same adapter — so the mock path exercises exactly the code a real backend
  response would. This is the only file that branches; hooks and screens
  never check USE_MOCKS themselves.
*/

import {
  adaptDeterioration,
  adaptFoodLossAnalytics,
  adaptFoodLossSeries,
  adaptInventoryBatch,
  adaptOptimizationResult,
  adaptScenarioComparison,
  adaptSimulationState,
  adaptSpoilagePrediction,
  adaptTelemetrySample,
  adaptThermalExposure,
} from './adapters'
import { apiClient, USE_MOCKS } from './client'
import type {
  DeteriorationDto,
  FoodLossAnalyticsDto,
  FoodLossSeriesDto,
  InventoryBatchDto,
  OptimizationEvaluateRequestDto,
  OptimizationResultDto,
  ScenarioComparisonDto,
  ScenarioId,
  SimulationStartRequestDto,
  SimulationStateDto,
  SpoilagePredictionDto,
  TelemetrySampleDto,
  ThermalExposureDto,
} from './dto'
import { endpoints } from './endpoints'
import * as mock from '../mocks/handlers'
import type {
  Deterioration,
  FoodLossAnalytics,
  FoodLossSeries,
  InventoryBatch,
  OptimizationResult,
  ScenarioComparison,
  SimulationState,
  SpoilagePrediction,
  ThermalExposure,
} from './types'

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

// ---- Optimization -----------------------------------------------------------

export async function fetchOptimizationCandidates(truckId: string, batchId: string): Promise<OptimizationResult> {
  const dto = USE_MOCKS
    ? await mock.getOptimizationCandidates(truckId, batchId)
    : (await apiClient.get<OptimizationResultDto>(endpoints.optimizationCandidates(truckId, batchId))).data
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
    : (await apiClient.get<InventoryBatchDto[]>(endpoints.inventory)).data
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

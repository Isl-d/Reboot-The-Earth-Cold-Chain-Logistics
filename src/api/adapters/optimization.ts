import type { OptimizationCandidateDto, OptimizationResultDto } from '../dto'
import type { OptimizationCandidate, OptimizationResult } from '../types'
import { expectArray, expectBoolean, expectNumber, expectString } from '../validation'

function adaptCandidate(dto: OptimizationCandidateDto, selectedWarehouseId: string): OptimizationCandidate {
  const resource = 'optimization candidate'
  const warehouseId = expectString(resource, 'warehouseId', dto.warehouseId)
  return {
    warehouseId,
    name: typeof dto.name === 'string' ? dto.name : undefined,
    distanceKm: typeof dto.distanceKm === 'number' ? dto.distanceKm : undefined,
    etaMinutes: expectNumber(resource, 'etaMinutes', dto.etaMinutes),
    expectedLossPercent: expectNumber(resource, 'expectedLossPercent', dto.expectedLossPercent),
    transportCost: expectNumber(resource, 'transportCost', dto.transportCost),
    foodLossCost: typeof dto.foodLossCost === 'number' ? dto.foodLossCost : undefined,
    delayCost: typeof dto.delayCost === 'number' ? dto.delayCost : undefined,
    objective: typeof dto.objective === 'number' ? dto.objective : undefined,
    feasible: expectBoolean(resource, 'feasible', dto.feasible),
    infeasibleReason: dto.infeasibleReason ?? null,
    // Legacy fields — optional, may be absent from real backend
    capacityKg: typeof dto.capacityKg === 'number' ? dto.capacityKg : undefined,
    temperatureCompatible: typeof dto.temperatureCompatible === 'boolean' ? dto.temperatureCompatible : undefined,
    selected: warehouseId === selectedWarehouseId,
  }
}

export function adaptOptimizationResult(dto: OptimizationResultDto): OptimizationResult {
  const resource = 'optimization result'
  const selectedWarehouseId = expectString(resource, 'selectedWarehouseId', dto.selectedWarehouseId)
  const candidateDtos = expectArray<OptimizationCandidateDto>(resource, 'candidates', dto.candidates)
  const candidates = candidateDtos.map((c) => adaptCandidate(c, selectedWarehouseId))
  return {
    candidates,
    selectedWarehouseId,
    selectedCandidate: candidates.find((c) => c.selected),
    objectiveValue: expectNumber(resource, 'objectiveValue', dto.objectiveValue),
  }
}

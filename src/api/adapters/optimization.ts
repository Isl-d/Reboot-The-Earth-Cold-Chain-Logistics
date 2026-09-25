import type { OptimizationCandidateDto, OptimizationResultDto } from '../dto'
import type { OptimizationCandidate, OptimizationResult } from '../types'
import { expectArray, expectBoolean, expectNumber, expectString } from '../validation'

function adaptCandidate(dto: OptimizationCandidateDto, selectedWarehouseId: string): OptimizationCandidate {
  const resource = 'optimization candidate'
  const warehouseId = expectString(resource, 'warehouseId', dto.warehouseId)
  return {
    warehouseId,
    etaMinutes: expectNumber(resource, 'etaMinutes', dto.etaMinutes),
    capacityKg: expectNumber(resource, 'capacityKg', dto.capacityKg),
    temperatureCompatible: expectBoolean(resource, 'temperatureCompatible', dto.temperatureCompatible),
    expectedLossPercent: expectNumber(resource, 'expectedLossPercent', dto.expectedLossPercent),
    transportCost: expectNumber(resource, 'transportCost', dto.transportCost),
    feasible: expectBoolean(resource, 'feasible', dto.feasible),
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

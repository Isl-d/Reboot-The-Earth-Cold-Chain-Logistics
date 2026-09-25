import type { SimulationStateDto } from '../dto'
import type { SimulationState } from '../types'
import { expectBoolean, expectNumber, expectString } from '../validation'

export function adaptSimulationState(dto: SimulationStateDto): SimulationState {
  const resource = 'simulation state'
  return {
    truckId: expectString(resource, 'truckId', dto.truckId),
    batchId: expectString(resource, 'batchId', dto.batchId),
    scenario: dto.scenario,
    speedMultiplier: expectNumber(resource, 'speedMultiplier', dto.speedMultiplier),
    running: expectBoolean(resource, 'running', dto.running),
    startedAtMs: Date.parse(expectString(resource, 'startedAt', dto.startedAt)),
  }
}

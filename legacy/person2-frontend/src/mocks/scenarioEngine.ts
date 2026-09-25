/*
  Pure functions that stand in for the AI Engine (docs/PIPELINE.md) while
  VITE_USE_MOCKS=true. Every value here is a deliberately simple, documented
  demo formula — never presented as the official calculation, and never
  reachable when talking to the real backend. Each of the 6 scenarios from
  docs/PERSON_2_FRONTEND_INTELLIGENCE.md §1 produces a distinct, believable
  curve as a pure function of elapsed simulated minutes, so the mock layer
  needs no growing history buffer — any point in time can be recomputed.
*/

import type { ScenarioId } from '../api/dto'

export const SAFE_TEMPERATURE_C = 4
const BASE_SHELF_LIFE_HOURS = 72

export function temperatureAt(scenario: ScenarioId, simMinutes: number): number {
  switch (scenario) {
    case 'NORMAL':
      return SAFE_TEMPERATURE_C + Math.sin(simMinutes / 4) * 0.3
    case 'TEMPERATURE_EXCURSION':
      return SAFE_TEMPERATURE_C + Math.min(5, simMinutes * 0.25)
    case 'DOOR_LEFT_OPEN': {
      // Sharp spike every ~15 sim-minutes (door opens), partial recovery between.
      const cyclePos = simMinutes % 15
      return SAFE_TEMPERATURE_C + (cyclePos < 3 ? cyclePos * 3 : Math.max(0, 9 - (cyclePos - 3) * 0.8))
    }
    case 'REFRIGERATION_FAILURE':
      return SAFE_TEMPERATURE_C + Math.min(14, simMinutes * 0.45)
    case 'TRAFFIC_DELAY':
      // Temperature stays controlled; only ETA/delay is affected (see delayMinutesAt).
      return SAFE_TEMPERATURE_C + Math.sin(simMinutes / 4) * 0.3
    case 'COMBINED_FAILURE':
      return SAFE_TEMPERATURE_C + Math.min(14, simMinutes * 0.45)
    default:
      return SAFE_TEMPERATURE_C
  }
}

export function humidityAt(scenario: ScenarioId, simMinutes: number): number {
  const base = 70
  if (scenario === 'DOOR_LEFT_OPEN') {
    const cyclePos = simMinutes % 15
    return Math.min(95, base + (cyclePos < 3 ? cyclePos * 6 : 0))
  }
  if (scenario === 'REFRIGERATION_FAILURE' || scenario === 'COMBINED_FAILURE') {
    return Math.min(90, base + simMinutes * 0.3)
  }
  return base + Math.sin(simMinutes / 6) * 2
}

export function doorOpenAt(scenario: ScenarioId, simMinutes: number): boolean {
  if (scenario !== 'DOOR_LEFT_OPEN') return false
  return simMinutes % 15 < 3
}

export function delayMinutesAt(scenario: ScenarioId, simMinutes: number): number {
  if (scenario === 'TRAFFIC_DELAY' || scenario === 'COMBINED_FAILURE') {
    return Math.min(40, simMinutes * 1.2)
  }
  return 0
}

/** Numerically integrates (temperature - safe) over [0, simMinutes] — accumulated exposure, C*min. */
export function integrateThermalExposure(scenario: ScenarioId, simMinutes: number): number {
  if (simMinutes <= 0) return 0
  const steps = Math.min(240, Math.max(4, Math.ceil(simMinutes)))
  const stepSize = simMinutes / steps
  let exposure = 0
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) * stepSize
    const excess = temperatureAt(scenario, t) - SAFE_TEMPERATURE_C
    if (excess > 0) exposure += excess * stepSize
  }
  return exposure
}

export function deteriorationFractionAt(exposure: number): number {
  return Math.min(0.95, 1 - Math.exp(-exposure / 500))
}

export function remainingShelfLifeHoursAt(deteriorationFraction: number): number {
  return Math.max(0, BASE_SHELF_LIFE_HOURS * (1 - deteriorationFraction))
}

export function spoilageProbabilityAt(deteriorationFraction: number): number {
  return Math.min(0.98, Math.pow(deteriorationFraction, 1.3))
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export function riskLevelAt(spoilageProbability: number): RiskLevel {
  if (spoilageProbability >= 0.7) return 'CRITICAL'
  if (spoilageProbability >= 0.4) return 'HIGH'
  if (spoilageProbability >= 0.15) return 'MEDIUM'
  return 'LOW'
}

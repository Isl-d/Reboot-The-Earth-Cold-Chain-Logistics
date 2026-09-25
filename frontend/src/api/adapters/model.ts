import type { DeteriorationDto, SpoilagePredictionDto, System1Dto, ThermalExposureDto } from '../dto'
import type { Deterioration, SpoilagePrediction, System1Decision, ThermalExposure } from '../types'
import { expectNumber, expectString } from '../validation'

export function adaptThermalExposure(dto: ThermalExposureDto): ThermalExposure {
  const resource = 'thermal exposure'
  const safeTemperatureC = expectNumber(resource, 'safeTemperatureC', dto.safeTemperatureC)
  const currentTemperatureC = expectNumber(resource, 'currentTemperatureC', dto.currentTemperatureC)
  return {
    safeTemperatureC,
    currentTemperatureC,
    exposureMinutes: expectNumber(resource, 'exposureMinutes', dto.exposureMinutes),
    thermalExposure: expectNumber(resource, 'thermalExposure', dto.thermalExposure),
    unit: expectString(resource, 'unit', dto.unit),
    isBreached: currentTemperatureC > safeTemperatureC,
  }
}

export function adaptDeterioration(dto: DeteriorationDto): Deterioration {
  const resource = 'deterioration'
  return {
    deteriorationFraction: expectNumber(resource, 'deteriorationFraction', dto.deteriorationFraction),
    remainingShelfLifeHours: expectNumber(resource, 'remainingShelfLifeHours', dto.remainingShelfLifeHours),
    confidence: expectNumber(resource, 'confidence', dto.confidence),
  }
}

export function adaptSpoilagePrediction(dto: SpoilagePredictionDto): SpoilagePrediction {
  const resource = 'spoilage prediction'
  return {
    spoilageProbability: expectNumber(resource, 'spoilageProbability', dto.spoilageProbability),
    confidence: expectNumber(resource, 'confidence', dto.confidence),
    modelVersion: expectString(resource, 'modelVersion', dto.modelVersion),
  }
}

// Laya is optional: absent or down must render an empty state, never an error.
export function adaptSystem1(dto: System1Dto): System1Decision {
  const s = dto.system1
  return {
    available: Boolean(dto.available && s),
    condition: s?.condition ?? null,
    action: s?.action ?? null,
    actionConfidence: s?.actionConfidence ?? null,
    agreesWithDecision: Boolean(s?.agreesWithDecision),
    urgency: s?.urgency ?? null,
    needsHumanReview: Boolean(s?.needsHumanReview),
    needsHumanReviewProbability: s?.needsHumanReviewProbability ?? null,
    latencyMs: s?.latencyMs ?? null,
    model: s?.model ?? null,
    calibrated: Boolean(s?.calibrated),
  }
}

import type { DeteriorationDto, SpoilagePredictionDto, ThermalExposureDto } from '../dto'
import type { Deterioration, SpoilagePrediction, ThermalExposure } from '../types'
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

import type { TelemetrySampleDto } from '../dto'
import type { TelemetrySample } from '../types'
import { expectBoolean, expectNumber, expectString } from '../validation'

export function adaptTelemetrySample(dto: TelemetrySampleDto): TelemetrySample {
  const resource = 'telemetry sample'
  return {
    timestampMs: Date.parse(expectString(resource, 'timestamp', dto.timestamp)),
    temperatureC: expectNumber(resource, 'temperatureC', dto.temperatureC),
    humidityPercent: expectNumber(resource, 'humidityPct', dto.humidityPct),
    doorOpen: expectBoolean(resource, 'doorOpen', dto.doorOpen),
  }
}

import type { TelemetrySample } from '@/api/types'

export interface ExcursionRange {
  x1: number
  x2: number
}

/** Contiguous ranges where temperature exceeds the safe threshold — for shading on the chart. */
export function computeExcursionBands(samples: TelemetrySample[], safeTemperatureC: number): ExcursionRange[] {
  const bands: ExcursionRange[] = []
  let start: number | null = null
  for (const sample of samples) {
    const above = sample.temperatureC > safeTemperatureC
    if (above && start === null) start = sample.timestampMs
    if (!above && start !== null) {
      bands.push({ x1: start, x2: sample.timestampMs })
      start = null
    }
  }
  if (start !== null && samples.length > 0) {
    bands.push({ x1: start, x2: samples[samples.length - 1].timestampMs })
  }
  return bands
}

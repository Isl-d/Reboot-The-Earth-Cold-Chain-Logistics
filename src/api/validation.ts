/*
  Lightweight runtime guards for adapters — no extra library. A malformed or
  reshaped backend response should surface as a clear, catchable error (which
  React Query turns into a screen's error state), never a silent NaN or a
  crash deep in a chart.
*/

export class AdapterValidationError extends Error {
  constructor(resource: string, field: string, detail: string) {
    super(`${resource}: field "${field}" ${detail}`)
    this.name = 'AdapterValidationError'
  }
}

export function expectNumber(resource: string, field: string, value: unknown): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new AdapterValidationError(resource, field, `expected a number, got ${JSON.stringify(value)}`)
  }
  return value
}

export function expectString(resource: string, field: string, value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new AdapterValidationError(resource, field, `expected a non-empty string, got ${JSON.stringify(value)}`)
  }
  return value
}

export function expectBoolean(resource: string, field: string, value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new AdapterValidationError(resource, field, `expected a boolean, got ${JSON.stringify(value)}`)
  }
  return value
}

export function expectArray<T>(resource: string, field: string, value: unknown): T[] {
  if (!Array.isArray(value)) {
    throw new AdapterValidationError(resource, field, `expected an array, got ${JSON.stringify(value)}`)
  }
  return value as T[]
}

// Read-only view of the backend the command center uses. Shapes follow
// docs/API_CONTRACT.md §4; only the fields the landing page renders are typed.
// The page never computes these values; it only displays them.

const BASE: string = import.meta.env.VITE_API_URL ?? ''

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

export interface TruckItem {
  id: string
  product: string
  quantityKg: number
  batchId: string | null
  temperatureC: number | null
  riskLevel: RiskLevel
  activeIncident: boolean
  refrigerationOn: boolean
  lastUpdated: string | null
}

export interface TruckDetail {
  truck: { id: string; temperatureC: number | null; routeName?: string }
  batch: { id: string; product: string; quantityKg: number; safeMinTempC: number; safeMaxTempC: number } | null
  recommendation: { action: string; destinationId: string | null } | null
}

export interface Reading {
  timestamp: string
  temperatureC: number | null
}

export interface Candidate {
  warehouseId: string
  name: string
  etaMinutes: number
  expectedLossPercent: number
  feasible: boolean
}

export interface Optimization {
  optimization: { candidates: Candidate[]; selectedWarehouseId: string | null }
}

export interface FoodLoss {
  savedKg: number
  estimatedFinancialLossPrevented: number
  co2AvoidedKg: number
  currency: string
  batches: { batchId: string; foodSavedKg: number; financialLossPrevented: number }[]
}

export interface Incident {
  id: string
  status: string
}

async function get<T>(path: string): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 4000)
  try {
    const res = await fetch(`${BASE}${path}`, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`${path} → ${res.status}`)
    // The dev server answers unknown paths with index.html; treat that as offline.
    if (!res.headers.get('content-type')?.includes('json')) throw new Error(`${path} → not JSON`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

export const api = {
  trucks: () => get<{ trucks: TruckItem[] }>('/api/trucks').then((r) => r.trucks),
  truck: (id: string) => get<TruckDetail>(`/api/trucks/${id}`),
  telemetry: (id: string, from: string) =>
    get<Reading[]>(`/api/trucks/${id}/telemetry?from=${encodeURIComponent(from)}&limit=2000`),
  optimization: (batchId: string) => get<Optimization>(`/api/optimization/${batchId}`),
  foodLoss: () => get<FoodLoss>('/api/analytics/food-loss'),
  incidents: () => get<Incident[]>('/api/incidents'),
}

/*
  Frontend model types — what screens and components actually consume.
  Adapters in src/api/adapters/ turn the wire shapes in dto.ts into these.
  A backend rename/restructure means editing dto.ts + one adapter; these
  types (and every screen that uses them) stay the same.
*/

export type { ScenarioId, InventoryAction } from './dto'
import type { InventoryAction, ScenarioId } from './dto'

export interface SimulationState {
  truckId: string
  batchId: string
  scenario: ScenarioId
  speedMultiplier: number
  running: boolean
  startedAtMs: number
}

export interface ThermalExposure {
  safeTemperatureC: number
  currentTemperatureC: number
  exposureMinutes: number
  thermalExposure: number
  unit: string
  /** Display convenience derived from the two fields above — not a recomputation of the official value. */
  isBreached: boolean
}

export interface Deterioration {
  deteriorationFraction: number
  remainingShelfLifeHours: number
  confidence: number
}

export interface SpoilagePrediction {
  spoilageProbability: number
  confidence: number
  modelVersion: string
}

/**
 * The local Laya System-1 read (see docs/ARCHITECTURE.md "dual process").
 * `available` is false when Laya is off; every other field is then null.
 */
export interface System1Decision {
  available: boolean
  condition: string | null
  cause: string | null
  action: string | null
  actionConfidence: number | null
  agreesWithDecision: boolean
  urgency: number | null
  needsHumanReview: boolean
  needsHumanReviewProbability: number | null
  latencyMs: number | null
  model: string | null
  /** Base checkpoints ship over-confident; false until calibrated on our data. */
  calibrated: boolean
}

export interface ExplainSource {
  title: string | null
  source: string | null
  licence: string | null
  url: string | null
}

/** A grounded, cited explanation plus which AI layers were involved. */
export interface ExplainResult {
  source: string
  blocked: boolean
  explanation: string
  action: string | null
  grounded: boolean
  sources: ExplainSource[]
  routing: string | null
  usedFrontier: boolean
  guardrailsFlagged: boolean
  moderationFlagged: boolean
}

export interface OptimizationCandidate {
  warehouseId: string
  name?: string
  distanceKm?: number
  etaMinutes: number
  expectedLossPercent: number
  transportCost: number
  foodLossCost?: number
  delayCost?: number
  objective?: number
  feasible: boolean
  infeasibleReason?: string | null
  // Legacy / optional — absent when the real backend doesn't return them
  capacityKg?: number
  temperatureCompatible?: boolean
  /** Derived: warehouseId === selectedWarehouseId, so screens don't re-derive it. */
  selected: boolean
}

export interface OptimizationResult {
  candidates: OptimizationCandidate[]
  selectedWarehouseId: string
  selectedCandidate: OptimizationCandidate | undefined
  objectiveValue: number
}

export interface FoodLossAnalytics {
  period: string
  transportedKg: number
  atRiskKg: number
  lostKg: number
  savedKg: number
  lossRatePercent: number
  preventedLossPercent: number
  estimatedFinancialLoss: number
  estimatedFinancialLossPrevented: number
  /** undefined when the backend hasn't started sending this field yet. */
  co2AvoidedKg: number | undefined
}

export interface InventoryBatch {
  batchId: string
  product: string
  locationId: string
  quantityKg: number
  expiryDate: string
  /** Display convenience: calendar days until expiryDate — not a spoilage calculation. */
  daysUntilExpiry: number
  predictedDemandKg: number
  expectedExcessKg: number
  spoilageProbability: number
  recommendation: InventoryAction
  /** PROPOSED backend field — undefined when this batch isn't tied to a truck. */
  truckId: string | undefined
}

export interface TelemetrySample {
  timestampMs: number
  temperatureC: number
  humidityPercent: number
  doorOpen: boolean
}

export interface FoodLossTimePoint {
  dateMs: number
  lostKg: number
  predictedLostKg: number
}

export interface FoodLossBreakdownItem {
  label: string
  lostKg: number
}

export interface FoodLossSeries {
  overTime: FoodLossTimePoint[]
  byCause: FoodLossBreakdownItem[]
  byProduct: FoodLossBreakdownItem[]
  byWarehouse: FoodLossBreakdownItem[]
}

export interface SimTruckOption {
  truckId: string
  label: string
  batchId: string
  product: string
  quantityKg: number
}

export interface ScenarioComparison {
  scenario: ScenarioId
  withoutInterventionLossPercent: number
  withOptimizationLossPercent: number
  foodSavedKg: number
  financialSavedQar: number
}

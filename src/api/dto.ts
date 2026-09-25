/*
  Wire shapes — exactly what the backend sends today, per the example JSON in
  docs/PERSON_2_FRONTEND_INTELLIGENCE.md. "DTO" = Data Transfer Object: the
  shape as it arrives over the wire, before src/api/adapters/ turns it into
  the frontend model types in src/api/types.ts.

  When the backend's real contract differs from these examples, this is the
  ONLY file that should need field-level edits — screens and components
  consume the adapted model types and never import from here directly.
*/

// ---- Simulation (§1) ----------------------------------------------------

export type ScenarioId =
  | 'NORMAL'
  | 'TEMPERATURE_EXCURSION'
  | 'DOOR_LEFT_OPEN'
  | 'REFRIGERATION_FAILURE'
  | 'TRAFFIC_DELAY'
  | 'COMBINED_FAILURE'

export interface SimulationStartRequestDto {
  truckId: string
  scenario: ScenarioId
  speedMultiplier: number
}

export interface SimulationStateDto {
  truckId: string
  batchId: string
  scenario: ScenarioId
  speedMultiplier: number
  running: boolean
  /** ISO 8601 timestamp the simulation was (re)started at. */
  startedAt: string
}

// ---- Mathematical Model (§2) ---------------------------------------------

export interface ThermalExposureDto {
  safeTemperatureC: number
  currentTemperatureC: number
  exposureMinutes: number
  thermalExposure: number
  unit: string
}

export interface DeteriorationDto {
  deteriorationFraction: number
  remainingShelfLifeHours: number
  confidence: number
}

export interface SpoilagePredictionDto {
  spoilageProbability: number
  confidence: number
  modelVersion: string
}

// ---- Optimization (§3) ---------------------------------------------------

export interface OptimizationCandidateDto {
  warehouseId: string
  etaMinutes: number
  capacityKg: number
  temperatureCompatible: boolean
  expectedLossPercent: number
  transportCost: number
  feasible: boolean
}

export interface OptimizationResultDto {
  candidates: OptimizationCandidateDto[]
  selectedWarehouseId: string
  objectiveValue: number
}

export interface OptimizationEvaluateRequestDto {
  truckId: string
  batchId: string
}

// ---- Food-loss analytics (§4) --------------------------------------------

export interface FoodLossAnalyticsDto {
  period: string
  transportedKg: number
  atRiskKg: number
  lostKg: number
  savedKg: number
  lossRatePercent: number
  preventedLossPercent: number
  estimatedFinancialLoss: number
  estimatedFinancialLossPrevented: number
  /** CO2 avoided — docs/PIPELINE.md Food Loss Engine output, kept optional since the spec's own example JSON omits it. */
  co2AvoidedKg?: number
}

// ---- Inventory (§5) --------------------------------------------------

export type InventoryAction = 'CONTINUE' | 'TRANSFER' | 'DISCOUNT' | 'PRIORITIZE_SALE' | 'REDISTRIBUTE' | (string & {})

export interface InventoryBatchDto {
  batchId: string
  product: string
  locationId: string
  quantityKg: number
  expiryDate: string
  predictedDemandKg: number
  expectedExcessKg: number
  spoilageProbability: number
  recommendation: InventoryAction
}

// ---- Scenario comparison (§6) --------------------------------------------
// Not in the spec's example JSON — proposed in docs/api-contracts.md.

export interface ScenarioComparisonDto {
  scenario: ScenarioId
  withoutInterventionLossPercent: number
  withOptimizationLossPercent: number
  foodSavedKg: number
  financialSavedQar: number
}

// ---- PROPOSED — not in the spec, drafted in docs/api-contracts.md --------
// Every type below needs backend confirmation. Field names may change once
// confirmed; only this file and the matching adapter should need edits.

/** GET /api/trucks/{id}/telemetry response item. */
export interface TelemetrySampleDto {
  /** ISO 8601 timestamp. */
  timestamp: string
  temperatureC: number
  humidityPercent: number
  doorOpen: boolean
}

/** GET /api/analytics/food-loss/series — the chart data §4's charts need beyond the single-period summary. */
export interface FoodLossTimePointDto {
  /** ISO 8601 date, one point per day. */
  date: string
  lostKg: number
  predictedLostKg: number
}

export interface FoodLossBreakdownItemDto {
  label: string
  lostKg: number
}

export interface FoodLossSeriesDto {
  overTime: FoodLossTimePointDto[]
  byCause: FoodLossBreakdownItemDto[]
  byProduct: FoodLossBreakdownItemDto[]
  byWarehouse: FoodLossBreakdownItemDto[]
}

/** /ws/live push message (same stream as Person 1's /sensors/live — see docs/PIPELINE.md "Resolved"). */
export interface LiveMessageDto {
  truckId: string
  sample: TelemetrySampleDto
}

/**
 * GET /api/trucks — simulation-config metadata (which trucks exist and what
 * they're carrying), for the Simulation screen's truck/batch selectors. Not
 * to be confused with Person 1's live `Truck` interface (GPS/telemetry) in
 * shared-types.ts — this is just picklist data.
 */
export interface SimTruckOptionDto {
  truckId: string
  label: string
  batchId: string
  product: string
  quantityKg: number
}

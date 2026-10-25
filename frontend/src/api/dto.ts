/*
  Wire shapes — exactly what the backend sends today, per the example JSON in
  docs/API_CONTRACT.md. "DTO" = Data Transfer Object: the
  shape as it arrives over the wire, before src/api/adapters/ turns it into
  the frontend model types in src/api/types.ts.

  When the backend's real contract differs from these examples, this is the
  ONLY file that should need field-level edits — screens and components
  consume the adapted model types and never import from here directly.
*/

// ---- Simulation ----------------------------------------------------

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

// ---- Mathematical Model ---------------------------------------------

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

/**
 * GET /api/system1/{truckId} — the local Laya System-1 read. `system1` is null
 * when Laya is disabled or unreachable; the screen shows an empty state.
 */
export interface System1Dto {
  truckId: string
  batchId?: string | null
  available: boolean
  system1: {
    source?: string
    model?: string | null
    condition?: string | null
    conditionConfidence?: number | null
    cause?: string | null
    causeConfidence?: number | null
    action?: string | null
    actionConfidence?: number | null
    agreesWithDecision?: boolean
    urgency?: number | null
    needsHumanReview?: boolean
    needsHumanReviewProbability?: number | null
    routeDelayMaterialProbability?: number | null
    deterministicAction?: string | null
    latencyMs?: number | null
    calibrated?: boolean
    provenance?: string
  } | null
  deterministicDecision?: { action?: string; destinationId?: string | null } | null
  generatedAt?: string
}

/** POST /api/ai/explain — grounded explanation with citations and AI-layer metadata. */
export interface ExplainSourceDto {
  id?: string | null
  title?: string | null
  source?: string | null
  licence?: string | null
  url?: string | null
}

export interface ExplainDto {
  source: string
  modelVersion?: string
  blocked?: boolean
  explanation?: string | null
  action?: string | null
  grounded?: boolean
  sources?: ExplainSourceDto[]
  routing?: { decision?: string; useFrontier?: boolean; confidence?: number | null } | null
  grounding?: { needsGrounding?: boolean; domain?: string } | null
  guardrails?: { flagged?: boolean; promptInjection?: number | null } | null
  moderation?: { flagged?: boolean } | null
}

// ---- Optimization ---------------------------------------------------

export interface OptimizationCandidateDto {
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
  // Legacy fields — may be absent from real backend
  capacityKg?: number
  temperatureCompatible?: boolean
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

// ---- Food-loss analytics --------------------------------------------

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

// ---- Inventory --------------------------------------------------

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
  /**
   * Needed for the "Evaluate options" row action (POST
   * /api/optimization/evaluate needs a truckId). Absent when the batch isn't
   * currently associated with a truck; see docs/API_CONTRACT.md §4.6.
   */
  truckId?: string
}

// ---- Scenario comparison --------------------------------------------
// docs/API_CONTRACT.md §4.7.

export interface ScenarioComparisonDto {
  scenario: ScenarioId
  withoutInterventionLossPercent: number
  withOptimizationLossPercent: number
  foodSavedKg: number
  financialSavedQar: number
}

// ---- Telemetry, food-loss series, live stream, simulation trucks --------
// Shapes per docs/API_CONTRACT.md §4, §5 and §6.

/** GET /api/trucks/{id}/telemetry response item. */
export interface TelemetrySampleDto {
  /** ISO 8601 timestamp. */
  timestamp: string
  temperatureC: number
  /** Backend sends `humidityPct` (not `humidityPercent`). */
  humidityPct: number
  doorOpen: boolean
}

/** GET /api/analytics/food-loss/series — the chart data the food-loss charts need beyond the single-period summary. */
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

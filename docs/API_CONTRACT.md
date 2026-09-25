# API Contract — Thermal Trace

> Single source of truth for every wire shape. Domain objects and their types
> live in [`DOMAIN_MODEL.md`](DOMAIN_MODEL.md). In the JSON examples below,
> lines beginning with `//` are **provenance annotations**, not bytes on the
> wire.

## 0. Provenance vocabulary

Every value a consumer sees is tagged with exactly one of:

| Tag | Meaning |
|---|---|
| **MEASURED** | A raw sensor value, stored as received (after validation/normalization). |
| **CALCULATED** | Deterministic math over measured/derived values (exposure, deterioration, shelf life, distance, ETA, objective). |
| **PREDICTED** | A model estimate with uncertainty (spoilage probability, confidence), possibly LLM-adjusted inside guardrails. |
| **OPTIMIZED** | The chosen result of the optimization objective (selected warehouse, objective value). |
| **AI-EXPLAINED** | Natural-language text authored by explainer over structured facts; never a source of numbers. |
| **SYNTHETIC** | Reference/demo data seeded from `data/*.csv` or produced by the simulator. |

**Currency:** all monetary values are **QAR**. Both `/api/analytics/food-loss`
and `/api/analytics/scenario-comparison/{scenario}` emit `"currency": "QAR"`.

## 1. Sensor → backend (MQTT)

Topics are configured in `backend/config.py`:
telemetry `coldchain/trucks/+/telemetry`, events `coldchain/trucks/+/events`,
control `coldchain/control/{truck_id}`.

### 1.1 Telemetry — `coldchain/trucks/{truckId}/telemetry`

Published by `sensor-simulator/simulator.py` each tick. Consumed and validated
by `backend/ingest/consumer.py`. Short spellings (`temperature`, `humidity`,
`lat`, `lon`, `speed`, `gforce`) are also accepted on ingestion; outbound is
always camelCase.

```json
{
  "deviceId": "TRUCK-T102",        // SYNTHETIC (fleet.csv)
  "truckId": "T102",               // SYNTHETIC
  "timestamp": "2026-09-24T16:20:00Z", // SYNTHETIC (clock) → MEASURED on receipt
  "temperatureC": 7.2,             // MEASURED
  "humidityPct": 74.0,             // MEASURED
  "latitude": 25.2854,             // MEASURED
  "longitude": 51.531,             // MEASURED
  "speedKmh": 42.0,                // MEASURED
  "gForce": 0.2,                   // MEASURED
  "doorOpen": false,               // MEASURED
  "refrigerationOn": true          // MEASURED
}
```

Rejected readings are never dropped: they are written to `ingest_rejects` with
the joined reason string (Pydantic errors, clock skew, implausible temperature,
unknown device). Metrics: `CC_MIN_PLAUSIBLE_TEMP_C=-60`,
`CC_MAX_PLAUSIBLE_TEMP_C=80`.

### 1.2 Events — `coldchain/trucks/{truckId}/events`

Published by the simulator on transitions (door, refrigeration, shock, scenario
change). The consumer validates the payload against a closed type set, stores a
`DeviceEvent`, and broadcasts `DEVICE_EVENT` on `/ws/live` (see §5). Unknown
types are rejected and logged, never stored.

Allowed types (`backend/ingest/events.py`): `DOOR_OPENED`, `DOOR_CLOSED`,
`REFRIGERATION_ON`, `REFRIGERATION_OFF`, `SHOCK`, `POWER_LOST`,
`POWER_RESTORED`, `SENSOR_FAULT`, `SCENARIO_CHANGED`.

```json
{
  "truckId": "T102",                       // SYNTHETIC
  "deviceId": "TRUCK-T102",                // SYNTHETIC
  "type": "SCENARIO_CHANGED",              // SYNTHETIC
  "detail": "REFRIGERATION_FAILURE",       // SYNTHETIC
  "value": null,                           // SYNTHETIC
  "timestamp": "2026-09-24T16:20:00Z"      // SYNTHETIC
}
```

### 1.3 Control — `coldchain/control/{truckId}` (or `.../all`)

Backend → simulator. Published by `pipeline.publish_control` when a
`/api/simulation/*` route is called. All fields optional; the simulator applies
whichever are present.

```json
{
  "scenario": "REFRIGERATION_FAILURE", // SYNTHETIC (requested)
  "speedMultiplier": 10.0,             // SYNTHETIC (requested)
  "paused": false,                     // SYNTHETIC (requested)
  "reset": false                       // SYNTHETIC (requested)
}
```

Allowed scenarios: `NORMAL`, `TEMPERATURE_EXCURSION`, `DOOR_LEFT_OPEN`,
`REFRIGERATION_FAILURE`, `TRAFFIC_DELAY`, `COMBINED_FAILURE`, `G_FORCE_EVENT`.

## 2. Backend → intelligence (context bundle)

`GET /api/internal/context/{truckId}?telemetry=60`

Built by `backend/context.py::build_context` — the single Person 3 → Person 4
seam, also called by the intelligence worker, so the HTTP bundle and the worker
input can never diverge.

```json
{
  "truck": {
    "id": "T102",                    // SYNTHETIC (reference)
    "latitude": 25.2854,             // MEASURED
    "longitude": 51.531,             // MEASURED
    "speedKmh": 42.0,                // MEASURED
    "routeId": "R1",                 // SYNTHETIC
    "routeDistanceKm": 32.5,         // SYNTHETIC (route.csv)
    "routeDurationMin": 40.0         // SYNTHETIC
  },
  "batch": {
    "id": "CHK-1029",                // SYNTHETIC
    "product": "Fresh Chicken",      // SYNTHETIC
    "quantityKg": 500.0,             // SYNTHETIC
    "productionDate": "2026-09-21",  // SYNTHETIC
    "expiryDate": "2026-09-28",      // SYNTHETIC
    "safeMinTempC": 0.0,             // SYNTHETIC
    "safeMaxTempC": 4.0,             // SYNTHETIC
    "initialShelfLifeHours": 168.0,  // SYNTHETIC
    "valuePerKg": 20.0,              // SYNTHETIC (QAR/kg)
    "activationEnergyJMol": 90000.0, // SYNTHETIC (model config)
    "idealTempC": 2.0,               // SYNTHETIC
    "humidityLimitPct": 90.0         // SYNTHETIC
  },
  "derived": {
    "distance_km": 0.42,             // CALCULATED
    "traveled_km": 12.8,             // CALCULATED
    "remaining_km": 19.7,            // CALCULATED
    "speed_kmh": 42.0,               // MEASURED (echoed)
    "temperature_deviation_c": 3.2,  // CALCULATED
    "time_above_threshold_s": 186.0, // CALCULATED
    "door_duration_s": 0.0,          // CALCULATED
    "eta_minutes": 28.1,             // CALCULATED
    "interval_s": 3.0,               // CALCULATED
    "readings": 120                  // CALCULATED
  },
  "liveRisk": {                      // baseline, from backend/risk.py
    "riskScore": 61,                 // CALCULATED
    "riskLevel": "MEDIUM",           // CALCULATED
    "factors": {}                    // CALCULATED
  },
  "recentTelemetry": [
    {
      "truckId": "T102",             // MEASURED
      "timestamp": "2026-09-24T16:20:00Z", // MEASURED
      "temperatureC": 7.2,           // MEASURED
      "humidityPct": 74.0,           // MEASURED
      "latitude": 25.2854,           // MEASURED
      "longitude": 51.531,           // MEASURED
      "speedKmh": 42.0,              // MEASURED
      "gForce": 0.2,                 // MEASURED
      "doorOpen": false,             // MEASURED
      "refrigerationOn": true        // MEASURED
    }
  ],
  "candidateWarehouses": [
    {
      "id": "WH01",                  // SYNTHETIC
      "name": "Central Warehouse",   // SYNTHETIC
      "latitude": 25.236,            // SYNTHETIC
      "longitude": 51.472,           // SYNTHETIC
      "capacityKg": 2000.0,          // SYNTHETIC
      "availableCapacityKg": 1200.0, // SYNTHETIC
      "minTempC": 0.0,               // SYNTHETIC
      "maxTempC": 4.0                // SYNTHETIC
    },
    {
      "id": "WH02",                  // SYNTHETIC
      "name": "North Cold Store",    // SYNTHETIC
      "latitude": 25.42,             // SYNTHETIC
      "longitude": 51.49,            // SYNTHETIC
      "capacityKg": 1500.0,          // SYNTHETIC
      "availableCapacityKg": 800.0,  // SYNTHETIC
      "minTempC": 0.0,               // SYNTHETIC
      "maxTempC": 4.0                // SYNTHETIC
    },
    {
      "id": "WH03",                  // SYNTHETIC
      "name": "South Distribution Hub", // SYNTHETIC
      "latitude": 25.10,             // SYNTHETIC
      "longitude": 51.62,            // SYNTHETIC
      "capacityKg": 1200.0,          // SYNTHETIC
      "availableCapacityKg": 600.0,  // SYNTHETIC
      "minTempC": 0.0,               // SYNTHETIC
      "maxTempC": 4.0                // SYNTHETIC
    }
  ]
}
```

Returns `404` for an unknown truck. `?telemetry=` is clamped to 1–1000 (default
60); the worker uses `CC_INTELLIGENCE_TELEMETRY_WINDOW` (default 120).

## 3. Intelligence → backend (prediction post)

`POST /api/internal/predictions` stores an externally-computed prediction and
broadcasts `PREDICTION_UPDATED`. Body is `backend/schemas.py::PredictionIn`.

Request:

```json
{
  "id": "PRED-1A2B3C4D",             // optional; server generates if absent
  "truckId": "T102",                 // required, must exist
  "batchId": "CHK-1029",             // PREDICTED
  "thermalExposure": 42.8,           // CALCULATED
  "remainingShelfLifeHours": 38.0,   // PREDICTED
  "spoilageProbability": 0.73,       // PREDICTED
  "confidence": 0.91,                // PREDICTED
  "riskScore": 78,                   // PREDICTED
  "riskLevel": "HIGH",               // PREDICTED
  "recommendation": {                // OPTIMIZED + AI-EXPLAINED
    "action": "DIVERT",
    "destinationId": "WH01",
    "etaMinutes": 4.4,
    "expectedLossPercent": 26.42,
    "foodSavedKg": 71.5,
    "reasoning": "Divert to Central Warehouse: it is the only feasible cold store within remaining safe time."
  },
  "modelVersion": "person4"
}
```

Response `200`:

```json
{
  "status": "stored",
  "prediction": {
    "id": "PRED-1A2B3C4D",
    "truckId": "T102",
    "batchId": "CHK-1029",
    "thermalExposure": 42.8,
    "remainingShelfLifeHours": 38.0,
    "spoilageProbability": 0.73,
    "confidence": 0.91,
    "riskScore": 78,
    "riskLevel": "HIGH",
    "modelVersion": "person4",
    "createdAt": "2026-09-24T16:20:00Z"
  }
}
```

Unknown truck → `404`.

## 4. Backend → frontend REST

### 4.1 `GET /api/trucks` → list item

`backend/routers/trucks.py` `list_trucks`. Returns a **wrapped object**
`{ "trucks": [ ... ] }` (the same array backs the `/ws/live` `HELLO`). Each item
carries both the live fields and the picklist fields:

```json
{
  "id": "T102",                      // SYNTHETIC
  "name": "Truck T102",              // SYNTHETIC
  "latitude": 25.2854,               // MEASURED
  "longitude": 51.531,               // MEASURED
  "speedKmh": 42.0,                  // MEASURED
  "temperatureC": 7.2,               // MEASURED
  "humidityPct": 74.0,               // MEASURED
  "gForce": 0.2,                     // MEASURED
  "doorOpen": false,                 // MEASURED
  "refrigerationOn": true,           // MEASURED
  "riskScore": 78,                   // PREDICTED (person4) or CALCULATED (baseline)
  "riskLevel": "HIGH",               // PREDICTED / CALCULATED
  "activeIncident": true,            // CALCULATED
  "lastUpdated": "2026-09-24T16:20:00Z", // MEASURED
  "truckId": "T102",                 // SYNTHETIC (alias of id)
  "label": "Truck T102",             // SYNTHETIC
  "batchId": "CHK-1029",             // SYNTHETIC
  "product": "Fresh Chicken",        // SYNTHETIC
  "quantityKg": 500.0                // SYNTHETIC
}
```

`riskScore`/`riskLevel` prefer the latest stored prediction (person4) and fall
back to the baseline risk.

### 4.2 `GET /api/trucks/{truckId}` → detail

```json
{
  "truck": {
    "id": "T102",                    // SYNTHETIC
    "productBatchId": "CHK-1029",    // SYNTHETIC
    "latitude": 25.2854,             // MEASURED
    "longitude": 51.531,             // MEASURED
    "temperatureC": 7.2,             // MEASURED
    "humidityPct": 74.0,             // MEASURED
    "speedKmh": 42.0,                // MEASURED
    "gForce": 0.2,                   // MEASURED
    "doorOpen": false,               // MEASURED
    "refrigerationOn": true,         // MEASURED
    "routeId": "R1",                 // SYNTHETIC
    "routeName": "Hamad Port to Central Warehouse" // SYNTHETIC
  },
  "batch": {
    "id": "CHK-1029",                // SYNTHETIC
    "product": "Fresh Chicken",      // SYNTHETIC
    "quantityKg": 500.0,             // SYNTHETIC
    "productionDate": "2026-09-21",  // SYNTHETIC
    "expiryDate": "2026-09-28",      // SYNTHETIC
    "safeMinTempC": 0.0,             // SYNTHETIC
    "safeMaxTempC": 4.0,             // SYNTHETIC
    "initialShelfLifeHours": 168.0   // SYNTHETIC
  },
  "prediction": {
    "thermalExposure": 42.8,         // CALCULATED
    "remainingShelfLifeHours": 38.0, // PREDICTED
    "spoilageProbability": 0.73,     // PREDICTED
    "confidence": 0.91,              // PREDICTED
    "riskScore": 78,                 // PREDICTED
    "riskLevel": "HIGH",             // PREDICTED
    "source": "person4",             // "baseline" when no prediction exists
    "factors": {},                   // CALCULATED
    "modelVersion": "heuristic-1",   // PREDICTED (model id)
    "createdAt": "2026-09-24T16:20:00Z" // MEASURED (timestamp)
  },
  "recommendation": {                // null when no prediction exists
    "action": "DIVERT",              // OPTIMIZED
    "destinationId": "WH01",         // OPTIMIZED
    "etaMinutes": 4.4,               // CALCULATED
    "expectedLossPercent": 26.42,    // CALCULATED
    "foodSavedKg": 71.5,             // CALCULATED
    "reasoning": "…"                 // AI-EXPLAINED
  }
}
```

### 4.3 `GET /api/predictions/{batchId}?refresh=false` → unified prediction

`backend/routers/intelligence.py` `_resolve`: returns the latest stored
`Prediction.result`, or re-runs the engine when `?refresh=true` or no record
exists. The same engine result is returned by `POST /api/ai/explain`'s `facts`
path and by the model endpoints.

```json
{
  "batchId": "CHK-1029",              // SYNTHETIC
  "truckId": "T102",                  // SYNTHETIC
  "temperatureC": 7.2,                // MEASURED
  "thermalExposure": 42.8,            // CALCULATED
  "exposureMinutes": 186.0,           // CALCULATED
  "deteriorationFraction": 0.184,     // CALCULATED
  "remainingShelfLifeHours": 38.0,    // CALCULATED
  "spoilageProbability": 0.73,        // PREDICTED
  "confidence": 0.91,                 // PREDICTED
  "spoilageSource": "heuristic",      // PREDICTED ("heuristic" | "explainer")
  "modelVersion": "heuristic-1",      // PREDICTED
  "riskScore": 78,                    // PREDICTED
  "riskLevel": "HIGH",                // PREDICTED
  "riskFactors": {                    // CALCULATED
    "spoilage_probability": 73.0,
    "thermal_exposure": 71.3,
    "remaining_shelf_life": 77.4,
    "anomaly": 0.0,
    "route_delay": 0.0,
    "humidity_exposure": 0.0
  },
  "anomaly": true,                    // CALCULATED
  "anomalyType": "TEMPERATURE_EXCURSION", // CALCULATED
  "anomalyScore": 3.1,                // CALCULATED
  "routeDelayMinutes": 0.0,           // CALCULATED
  "optimization": {                   // see 4.4
    "candidates": [],
    "selectedWarehouseId": "WH01",
    "objectiveValue": 2664.51,
    "feasible": true,
    "source": "deterministic",
    "rationale": null
  },
  "foodLoss": {                       // see 4.5
    "predictedLossKg": 132.5,
    "lossWithInterventionKg": 61.0,
    "foodSavedKg": 71.5,
    "financialLoss": 2650.0,
    "financialLossPrevented": 1430.0,
    "lossCause": "TEMPERATURE_EXCURSION"
  },
  "decision": {                       // OPTIMIZED
    "action": "DIVERT",
    "destinationId": "WH01",
    "etaMinutes": 4.4,
    "expectedLossPercent": 26.42
  },
  "recommendation": {                 // OPTIMIZED + AI-EXPLAINED
    "action": "DIVERT",
    "destinationId": "WH01",
    "etaMinutes": 4.4,
    "expectedLossPercent": 26.42,
    "foodSavedKg": 71.5,
    "reasoning": "…"
  },
  "features": {                       // CALCULATED (full feature dict)
    "thermalExposure": 42.8,
    "exposureMinutes": 186.0,
    "deteriorationFraction": 0.184,
    "remainingShelfLifeHours": 38.0,
    "timeAboveThresholdMinutes": 186.0,
    "timeAboveThresholdSeconds": 11160.0,
    "humidityExposure": 0.0,
    "doorOpenSeconds": 0.0,
    "windowDistanceKm": 12.8,
    "avgSpeedKmh": 42.0,
    "latestTemperatureC": 7.2,
    "minTemperatureC": 2.1,
    "maxTemperatureC": 7.4,
    "readings": 120,
    "safeMinTempC": 0.0,
    "safeMaxTempC": 4.0,
    "idealTempC": 2.0,
    "initialShelfLifeHours": 168.0
  },
  "provenance": {                     // provenance map (see §0)
    "temperatureC": "MEASURED",
    "thermalExposure": "CALCULATED",
    "exposureMinutes": "CALCULATED",
    "deteriorationFraction": "CALCULATED",
    "remainingShelfLifeHours": "CALCULATED",
    "spoilageProbability": "PREDICTED",
    "confidence": "PREDICTED",
    "riskScore": "CALCULATED",
    "anomaly": "PREDICTED",
    "routeDelayMinutes": "CALCULATED",
    "optimization": "OPTIMIZED",
    "decision": "CALCULATED",
    "foodLoss": "CALCULATED",
    "recommendation": "CALCULATED",   // "AI-EXPLAINED" when spoilage source=explainer
    "dataSource": "SYNTHETIC"
  },
  "generatedAt": "2026-09-24T16:20:00Z" // MEASURED (timestamp)
}
```

Unknown batch with no stored record → `404`.

Related single-slice routes:

- `GET /api/risk/{batchId}` → `{ batchId, truckId, riskScore, riskLevel, riskFactors, anomaly, anomalyType, generatedAt }`
- `GET /api/recommendations/{batchId}` → `{ batchId, truckId, riskLevel, recommendation, reasoning, generatedAt }`
- `GET /api/model/{truckId}/thermal-exposure` → `{ safeTemperatureC, currentTemperatureC, exposureMinutes, thermalExposure, unit, provenance: "CALCULATED" }`
- `GET /api/model/{truckId}/deterioration` → `{ deteriorationFraction, remainingShelfLifeHours, confidence, provenance: "CALCULATED" }`
- `GET /api/model/{truckId}/spoilage` → `{ spoilageProbability, confidence, modelVersion, provenance: "PREDICTED" }`

### 4.4 `GET /api/optimization/{batchId}?refresh=` → optimization

```json
{
  "batchId": "CHK-1029",             // SYNTHETIC
  "truckId": "T102",                 // SYNTHETIC
  "optimization": {
    "candidates": [
      {
        "warehouseId": "WH01",       // SYNTHETIC
        "name": "Central Warehouse", // SYNTHETIC
        "distanceKm": 3.047,         // CALCULATED
        "etaMinutes": 4.4,           // CALCULATED
        "expectedLossPercent": 26.42,// CALCULATED
        "transportCost": 13.71,      // CALCULATED (QAR)
        "foodLossCost": 2642.0,      // CALCULATED (QAR)
        "delayCost": 8.8,            // CALCULATED (QAR)
        "objective": 2664.51,        // OPTIMIZED
        "feasible": true,            // CALCULATED
        "infeasibleReason": null     // CALCULATED
      }
    ],
    "selectedWarehouseId": "WH01",   // OPTIMIZED
    "objectiveValue": 2664.51,       // OPTIMIZED
    "feasible": true,                // CALCULATED
    "source": "deterministic",       // "deterministic" | "explainer"
    "provenance": "OPTIMIZED",       // provenance tag
    "rationale": null                // AI-EXPLAINED (when source=explainer)
  }
}
```

`POST /api/optimization/evaluate` takes `{"truckId": "T102"}` or
`{"batchId": "CHK-1029"}` (at least one) and returns just the
`optimization` object above. Missing both → `422`; unknown → `404`.

### 4.5 `GET /api/analytics/food-loss` → food-loss summary

```json
{
  "period": "2026-09",                       // CALCULATED
  "transportedKg": 3500.0,                   // SYNTHETIC (batch quantities)
  "atRiskKg": 132.5,                         // CALCULATED
  "lostKg": 61.0,                            // CALCULATED
  "savedKg": 71.5,                           // CALCULATED
  "lossRatePercent": 1.74,                   // CALCULATED
  "preventedLossPercent": 53.96,             // CALCULATED
  "estimatedFinancialLoss": 2650.0,          // CALCULATED (QAR)
  "estimatedFinancialLossPrevented": 1430.0, // CALCULATED (QAR)
  "co2AvoidedKg": 178.75,                    // CALCULATED
  "batches": [                               // CALCULATED
    {
      "batchId": "CHK-1029",
      "truckId": "T102",
      "predictedLossKg": 132.5,
      "lossWithInterventionKg": 61.0,
      "foodSavedKg": 71.5,
      "financialLoss": 2650.0,
      "financialLossPrevented": 1430.0,
      "lossCause": "TEMPERATURE_EXCURSION"
    }
  ],
  "currency": "QAR",                         // CALCULATED
  "provenance": "CALCULATED"                 // summary-level tag
}
```

Companion breakdown endpoint `GET /api/analytics/food-loss/series`:

```json
{
  "overTime":     [{ "date": "2026-09-24", "lostKg": 61.0, "predictedLostKg": 132.5 }],
  "byCause":      [{ "label": "TEMPERATURE_EXCURSION", "lostKg": 61.0 }],
  "byProduct":    [{ "label": "Fresh Chicken", "lostKg": 61.0 }],
  "byWarehouse":  [{ "label": "WH01", "lostKg": 61.0 }]
}
```

All values **CALCULATED** from stored predictions.

### 4.6 `GET /api/inventory` → enriched inventory list

`backend/routers/inventory.py` `list_inventory` returns a **wrapped object**
`{ "inventory": [ ... ] }`. Each row is enriched with a demand forecast and an
inventory action. `GET /api/inventory/{batchId}` still returns a **bare array**
of the same rows filtered by batch (404 if none).

```json
{
  "batchId": "CHK-1028",             // SYNTHETIC
  "product": "Fresh Chicken",        // SYNTHETIC
  "locationId": "WH01",              // SYNTHETIC
  "quantityKg": 300.0,               // SYNTHETIC
  "expiryDate": "2026-09-26",        // SYNTHETIC
  "predictedDemandKg": 128.6,        // PREDICTED
  "expectedExcessKg": 171.4,         // CALCULATED
  "spoilageProbability": 0.62,       // PREDICTED
  "recommendation": "TRANSFER",      // OPTIMIZED
  "truckId": "T101",                 // SYNTHETIC (null when not on a truck)
  "id": "INV-1",                     // SYNTHETIC
  "locationType": "warehouse",       // SYNTHETIC
  "status": "in_stock"               // SYNTHETIC
}
```

Also available: `GET /api/analytics/inventory?days=3` →
`{ "totals": { "inventoryKg": …, "forecastDemandKg": …, "expectedExcessKg": … }, "items": [ { "id", "batchId", "product", "locationType", "locationId", "quantityKg", "daysToExpiry", "forecast", "forecastDemandKg", "expectedExcessKg", "recommendedAction", "reason" } ] }`.

### 4.7 `GET /api/analytics/scenario-comparison/{scenario}` → counterfactual

```json
{
  "scenario": "REFRIGERATION_FAILURE",   // SYNTHETIC
  "available": true,                     // CALCULATED
  "withoutInterventionLossPercent": 31.0,// PREDICTED (avg spoilage × 100)
  "withOptimizationLossPercent": 4.0,    // OPTIMIZED (avg decision expected loss)
  "foodSavedKg": 860.0,                  // CALCULATED
  "financialSavedQar": 9800.0,           // CALCULATED (QAR)
  "currency": "QAR",                     // CALCULATED
  "provenance": "OPTIMIZED"              // summary-level tag
}
```

When at least one prediction exists, `available` is `true` and the values above
are aggregated from the latest per-truck predictions. When none exist,
`available` is `false`, both percentage fields are `null`, and `foodSavedKg` /
`financialSavedQar` are `0.0` — the endpoint reports the empty state honestly
rather than inventing a headline fallback. The scenario string is upper-cased.

### 4.8 `GET /api/trucks/{truckId}/events` and `GET /api/device-events` → device events

`backend/routers/events.py`. Discrete typed events (what *happened*), separate
from sampled telemetry. `GET /api/trucks/{truckId}/events?limit=100` scopes to
one truck; `GET /api/device-events?limit=100` returns the fleet-wide feed. Both
return the events **oldest first**, and `limit` is clamped to 1–1000 (default
100).

```json
{
  "truckId": "T102",                 // SYNTHETIC (omitted on /api/device-events)
  "count": 1,                        // CALCULATED
  "events": [
    {
      "id": 1,                       // SYNTHETIC (autoincrement)
      "truckId": "T102",             // SYNTHETIC
      "deviceId": "TRUCK-T102",      // SYNTHETIC
      "timestamp": "2026-09-24T16:20:00Z", // MEASURED
      "type": "DOOR_OPENED",         // CALCULATED (closed vocabulary)
      "detail": "TEMPERATURE_EXCURSION", // SYNTHETIC
      "value": null                  // MEASURED
    }
  ]
}
```

The `/api/device-events` envelope is `{ "count", "events": [ ... ] }` (no
`truckId`). Allowed `type` values are listed in §1.2.

### 4.9 `GET /api/system1/{truckId}` → local Laya System-1 read

The **System 1** layer: Laya (Convai Innovations, Apache-2.0) runs locally in the
`laya` service and answers typed questions over the structured state. It never
generates text, so it cannot invent a number, and it **corroborates** the
deterministic decision rather than overriding it. `available` is `false` (and
`system1` is `null`) whenever the service is disabled or unreachable — that is
not an error.

```json
{
  "truckId": "T102",
  "batchId": "CHK-1029",
  "available": true,
  "system1": {
    "source": "laya",
    "model": "router",
    "condition": "refrigeration_failure",     // PREDICTED
    "conditionConfidence": 0.92,
    "action": "DIVERT",                        // PREDICTED
    "actionConfidence": 0.81,
    "agreesWithDecision": true,
    "urgency": 2.4,                            // 0 watch · 1 soon · 2 immediate
    "needsHumanReview": false,
    "needsHumanReviewProbability": 0.12,
    "routeDelayMaterialProbability": 0.05,
    "deterministicAction": "DIVERT",
    "latencyMs": 31.7,
    "usage": { "input_tokens": 140, "output_tokens": 0 },
    "calibrated": false,
    "provenance": "PREDICTED"
  },
  "deterministicDecision": { "action": "DIVERT", "destinationId": "WH01", "etaMinutes": 11.6, "expectedLossPercent": 6.55 },
  "generatedAt": "2026-09-25T16:20:00Z"
}
```

The same `system1` block rides along inside `GET /api/predictions/{batchId}`
(and the `PREDICTION_UPDATED` WebSocket frame) when Laya is available.

## 5. WebSocket `/ws/live`

One socket, one stream, no subscriptions. Every message is a JSON object with
an `event` field. `backend/ws.py` fans out to all connected clients.

| Event | Status | Emitted when |
|---|---|---|
| `HELLO` | implemented | Sent first on connect, carrying the fleet snapshot. |
| `TRUCK_STATE_UPDATED` | implemented | Every validated reading. |
| `INCIDENT_CREATED` | implemented | A new incident opens. |
| `INCIDENT_UPDATED` | implemented | An incident changes severity or resolves. |
| `PREDICTION_UPDATED` | implemented | The intelligence engine persists a prediction, or one is posted. |
| `RECOMMENDATION_UPDATED` | implemented | The engine persists a recommendation. |
| `FOOD_LOSS_UPDATED` | implemented | The engine persists a food-loss result. |
| `DEVICE_EVENT` | implemented | A typed device event arrives on `coldchain/trucks/+/events`. |

`HELLO` (sent first on connect):

```json
{
  "event": "HELLO",                  // CALCULATED
  "trucks": [ /* array of TRUCK_STATE_UPDATED payloads below */ ]
}
```

`TRUCK_STATE_UPDATED`:

```json
{
  "event": "TRUCK_STATE_UPDATED",    // event, not data
  "truckId": "T102",                 // MEASURED
  "timestamp": "2026-09-24T16:20:00Z", // MEASURED
  "temperatureC": 7.2,               // MEASURED
  "humidityPct": 74.0,               // MEASURED
  "latitude": 25.2854,               // MEASURED
  "longitude": 51.531,               // MEASURED
  "speedKmh": 42.0,                  // MEASURED
  "gForce": 0.2,                     // MEASURED
  "doorOpen": false,                 // MEASURED
  "refrigerationOn": true,           // MEASURED
  "riskScore": 61,                   // CALCULATED (baseline)
  "riskLevel": "MEDIUM"              // CALCULATED
}
```

`INCIDENT_CREATED` / `INCIDENT_UPDATED`:

```json
{
  "event": "INCIDENT_CREATED",       // or INCIDENT_UPDATED
  "id": "INC-1A2B3C4D",              // CALCULATED
  "truckId": "T102",                 // MEASURED
  "batchId": "CHK-1029",             // SYNTHETIC
  "type": "TEMPERATURE_EXCURSION",   // CALCULATED
  "severity": "HIGH",                // CALCULATED
  "message": "Temperature is above the batch safe maximum.", // CALCULATED
  "status": "OPEN",                  // CALCULATED
  "createdAt": "2026-09-24T16:20:00Z" // MEASURED
}
```

`PREDICTION_UPDATED` (`backend/intelligence/engine.py::_persist`):

```json
{
  "event": "PREDICTION_UPDATED",     // event
  "id": "PRED-1A2B3C4D",             // CALCULATED
  "truckId": "T102",                 // SYNTHETIC
  "batchId": "CHK-1029",             // SYNTHETIC
  "thermalExposure": 42.8,           // CALCULATED
  "deteriorationFraction": 0.184,    // CALCULATED
  "remainingShelfLifeHours": 38.0,   // CALCULATED
  "spoilageProbability": 0.73,       // PREDICTED
  "confidence": 0.91,                // PREDICTED
  "riskScore": 78,                   // PREDICTED
  "riskLevel": "HIGH",               // PREDICTED
  "anomaly": true,                   // CALCULATED
  "recommendation": {                // OPTIMIZED + AI-EXPLAINED
    "action": "DIVERT",
    "destinationId": "WH01",
    "etaMinutes": 4.4,
    "expectedLossPercent": 26.42,
    "foodSavedKg": 71.5,
    "reasoning": "…"
  },
  "modelVersion": "heuristic-1",     // PREDICTED
  "confidenceSource": "heuristic",   // PREDICTED
  "createdAt": "2026-09-24T16:20:00Z" // MEASURED
}
```

`DEVICE_EVENT` (relayed from the MQTT events topic after validation and
storage; `backend/ingest/consumer.py`):

```json
{
  "event": "DEVICE_EVENT",           // event
  "truckId": "T102",                 // SYNTHETIC
  "deviceId": "TRUCK-T102",          // SYNTHETIC
  "timestamp": "2026-09-24T16:20:00Z", // MEASURED
  "type": "DOOR_OPENED",             // CALCULATED (closed vocabulary)
  "detail": "TEMPERATURE_EXCURSION", // SYNTHETIC
  "value": null                      // MEASURED
}
```

Consumers should ignore unknown `event` values rather than error.

## 6. Simulation control (REST → MQTT)

`backend/routers/simulation.py`. The backend does not run the simulator; it
records a `SimulationRun` and publishes on the MQTT control topic.

### 6.1 `POST /api/simulation/start`

Request:

```json
{
  "truckId": "T102",                 // optional; omit for all
  "scenario": "REFRIGERATION_FAILURE", // SYNTHETIC
  "speedMultiplier": 1.0             // SYNTHETIC
}
```

Response:

```json
{
  "status": "started",               // CALCULATED
  "runId": "SIM-1A2B3C4D",           // SYNTHETIC
  "truckId": "T102",                 // SYNTHETIC
  "scenario": "REFRIGERATION_FAILURE", // SYNTHETIC
  "speedMultiplier": 1.0             // SYNTHETIC
}
```

An unknown scenario silently falls back to `NORMAL` on `/start`; it is rejected
with `422` on `/scenario`.

### 6.2 `POST /api/simulation/stop`

Request `{ "truckId": "T102" }` (optional). Publishes `{"paused": true}`.
Response: `{ "status": "stopped", "truckId": "T102" }`.

### 6.3 `POST /api/simulation/reset`

Request `{ "truckId": "T102" }` (optional). Publishes `{"reset": true, "paused": false}`.
Response: `{ "status": "reset", "truckId": "T102" }`.

### 6.4 `POST /api/simulation/scenario`

Request:

```json
{
  "truckId": "T102",                 // optional; omit for all
  "scenario": "DOOR_LEFT_OPEN",      // required, one of the 7
  "speedMultiplier": 5.0             // optional, default 1.0
}
```

Response:

```json
{
  "status": "accepted",              // CALCULATED
  "runId": "SIM-1A2B3C4D",           // SYNTHETIC
  "truckId": "T102",                 // SYNTHETIC
  "scenario": "DOOR_LEFT_OPEN",      // SYNTHETIC
  "published": true                  // CALCULATED (MQTT publish succeeded)
}
```

Unknown scenario → `422`:

```json
{
  "detail": {
    "error": "unknown scenario",
    "allowed": ["COMBINED_FAILURE", "DOOR_LEFT_OPEN", "G_FORCE_EVENT",
                "NORMAL", "REFRIGERATION_FAILURE", "TEMPERATURE_EXCURSION",
                "TRAFFIC_DELAY"]
  }
}
```

### 6.5 `GET /api/simulation/state/{truckId}` and `GET /api/simulation/{truckId}`

Both return the same shape (the second is a catch-all alias that must stay last
in the router):

```json
{
  "truckId": "T102",                 // SYNTHETIC
  "batchId": "CHK-1029",             // SYNTHETIC
  "scenario": "REFRIGERATION_FAILURE", // SYNTHETIC
  "speedMultiplier": 1.0,            // SYNTHETIC
  "running": true,                   // CALCULATED
  "startedAt": "2026-09-24T16:12:00Z" // MEASURED
}
```

## 7. Meta

- `GET /healthz` → `{ "status": "ok", "database": {…}, "redis": true, "mqtt": true, "trucks": 4 }`
- `GET /api/trucks` → `{ "trucks": [ … ] }` (wrapped; see 4.1)
- `GET /api/warehouses` → `{ "warehouses": [ { id, name, latitude, longitude, capacityKg, availableCapacityKg, minTempC, maxTempC } ] }`
- `GET /api/routes` → array of `{ id, name, origin, destination, distance_km, duration_min, waypoint_count }`
- `GET /api/routes/geojson`, `GET /api/routes/{routeId}/geojson`, `GET /api/routes/{routeId}/trucks`
- `GET /api/inventory` → `{ "inventory": [ … ] }`; `GET /api/inventory/{batchId}` → bare array (see 4.6)
- `GET /api/incidents?status=OPEN&truckId=T102&limit=200` → array of incident wire objects; `GET /api/incidents/{id}`
- `GET /api/trucks/{truckId}/telemetry?from=&to=&limit=500` → array of reading wire objects, oldest first
- `GET /api/trucks/{truckId}/events?limit=100` → `{ truckId, count, events: [ … ] }`, oldest first (see 4.8)
- `GET /api/device-events?limit=100` → `{ count, events: [ … ] }` (see 4.8)
- `GET /api/opendata` → `{ available, generatedAt, count, sources: [ { key, name, category, licence, url, access, output, fetched, status, rows } ], sourcesDoc, disclaimer }` — the licence/provenance catalogue for `data/opendata/`
- `POST /api/ai/explain` → routed + guarded + grounded explanation: `{ source: "explainer"|"template"|"guardrail", blocked, explanation, action, grounded, sources:[{id,title,source,licence,url}], routing:{decision,useFrontier,confidence}|null, grounding:{needsGrounding,domain}|null, guardrails:{flagged,...}|null, moderation:null, facts }`
- `POST /api/ai/triage` `{message}` → `{ triage: { intent, intentConfidence, urgency, needsHuman } | null }`
- `POST /api/ai/moderate` `{text}` → `{ moderation: { flagged, unsafeInstruction, toxic } | null }`
- `GET /api/ai/grounding?q=&k=` → `{ query, count, sources:[{id,title,source,licence,url}], prompt }`
- `GET /api/system1/{truckId}` → `{ truckId, batchId, available, system1, deterministicDecision, generatedAt }` (see 4.9; `system1` is `null` when Laya is off)
- `GET /docs` — OpenAPI UI

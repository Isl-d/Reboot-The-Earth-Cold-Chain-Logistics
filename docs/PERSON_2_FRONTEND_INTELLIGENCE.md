# Person 2 — Frontend Intelligence, Simulation & Food-Loss Analytics Context

## Project
AI-Powered Cold Chain Management & Food Loss Optimization System.

## Your ownership
You own the **intelligence/analytics frontend**:
- simulation
- mathematical model visualization
- optimization visualization
- inventory
- food-loss analytics
- scenario comparison

You consume results from backend/AI/optimization services. Do not implement the actual optimization or ML calculations in React.

## Tech stack
- React
- TypeScript
- Tailwind CSS
- Recharts
- Leaflet where useful
- Axios
- React Query

## Main screens

### 1. Simulation
Allow judges to trigger controlled scenarios:
- NORMAL
- TEMPERATURE_EXCURSION
- DOOR_LEFT_OPEN
- REFRIGERATION_FAILURE
- TRAFFIC_DELAY
- COMBINED_FAILURE

Controls:
- truck
- product/batch
- scenario
- simulation speed
- start/stop/reset

Call:
`POST /api/simulation/start`

Example:
```json
{
  "truckId": "T102",
  "scenario": "REFRIGERATION_FAILURE",
  "speedMultiplier": 10
}
```

## 2. Mathematical Model screen

Show the chain:

Sensor data
→ thermal exposure
→ deterioration
→ remaining shelf life
→ spoilage probability
→ risk

### Thermal exposure
Backend may return:
```json
{
  "safeTemperatureC": 4,
  "currentTemperatureC": 7.2,
  "exposureMinutes": 18,
  "thermalExposure": 42.8,
  "unit": "C*min"
}
```

Visualize the time-series and the accumulated exposure.

Do not recompute the official value in the frontend.

### Deterioration
Display:
```json
{
  "deteriorationFraction": 0.184,
  "remainingShelfLifeHours": 38,
  "confidence": 0.91
}
```

### Spoilage prediction
Display:
```json
{
  "spoilageProbability": 0.73,
  "confidence": 0.91,
  "modelVersion": "prototype-1"
}
```

Clearly label this as a prediction, not a confirmed food-safety determination.

## 3. Optimization screen

Display candidate destinations:
```json
{
  "candidates": [
    {
      "warehouseId": "WH01",
      "etaMinutes": 18,
      "capacityKg": 1200,
      "temperatureCompatible": true,
      "expectedLossPercent": 4.1,
      "transportCost": 143,
      "feasible": true
    },
    {
      "warehouseId": "WH02",
      "etaMinutes": 27,
      "capacityKg": 400,
      "temperatureCompatible": true,
      "expectedLossPercent": 8.0,
      "transportCost": 121,
      "feasible": true
    }
  ],
  "selectedWarehouseId": "WH01",
  "objectiveValue": 0.18
}
```

Show:
- candidate warehouses
- ETA
- capacity
- compatibility
- expected loss
- cost
- selected destination
- why the selected option is feasible

Show the mathematical objective:

`min transport cost + food-loss cost + delay cost`

with constraints:
- ETA <= remaining safe time
- quantity <= capacity
- storage temperature compatible
- route feasible

Do not claim the UI itself solved the optimization.

## 4. Food-loss analytics

Consume:
`GET /api/analytics/food-loss`

Expected response:
```json
{
  "period": "2026-09",
  "transportedKg": 12450,
  "atRiskKg": 1240,
  "lostKg": 380,
  "savedKg": 860,
  "lossRatePercent": 3.05,
  "preventedLossPercent": 69.35,
  "estimatedFinancialLoss": 4200,
  "estimatedFinancialLossPrevented": 9800
}
```

Charts:
- food loss over time
- loss by cause
- loss by product
- loss by warehouse
- predicted vs actual loss
- saved food
- financial impact

## 5. Inventory screen

Consume:
`GET /api/inventory`

Example:
```json
{
  "batchId": "CHK-1029",
  "product": "Fresh Chicken",
  "locationId": "STORE01",
  "quantityKg": 500,
  "expiryDate": "2026-09-27",
  "predictedDemandKg": 240,
  "expectedExcessKg": 260,
  "spoilageProbability": 0.62,
  "recommendation": "TRANSFER"
}
```

Show:
- quantity
- expiry
- demand forecast
- expected excess
- risk
- recommended action

Possible actions:
- CONTINUE
- TRANSFER
- DISCOUNT
- PRIORITIZE_SALE
- REDISTRIBUTE

## 6. Scenario comparison

Build a strong judge-facing visualization:

WITHOUT INTERVENTION
Expected loss: 31%

WITH OPTIMIZATION
Expected loss: 4%

Food saved:
82 kg

Use backend-provided counterfactual values.

## Data you receive

Primary APIs:
- `/api/simulation/*`
- `/api/analytics/*`
- `/api/inventory`
- `/api/optimization/*`
- `/api/trucks/{id}/telemetry`
- `/ws/live`

## Data you send
- simulation start/stop/reset
- scenario selection
- optional optimization request:
  `POST /api/optimization/evaluate`

Example:
```json
{
  "truckId": "T102",
  "batchId": "CHK-1029"
}
```

## Important separation
The frontend is a visualization layer.

Do NOT:
- train ML models
- calculate official spoilage probability
- calculate official shelf life
- solve routing
- modify sensor data
- invent mathematical constants

The frontend can display formulas and intermediate values returned by backend.

## Definition of done
A judge can:
1. Select a failure scenario.
2. Start the simulation.
3. See sensor graphs change.
4. See thermal exposure increase.
5. See shelf life decrease.
6. See AI risk increase.
7. See multiple destination options.
8. See the mathematical optimizer select an action.
9. Compare expected loss before/after intervention.
10. See total food and financial loss prevented.

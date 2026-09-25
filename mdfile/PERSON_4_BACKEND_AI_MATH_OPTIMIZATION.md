# Person 4 — AI, Mathematical Models, Optimization & Decision Engine Context

## Project
AI-Powered Cold Chain Management & Food Loss Optimization System.

## Your ownership
You own the **intelligence backend**:
- thermal exposure
- deterioration model
- remaining shelf life
- risk score
- spoilage prediction
- anomaly detection
- LAYLA local model integration
- demand forecasting
- route/warehouse optimization
- inventory recommendations
- decision engine
- food-loss calculations

## Core principle

Do NOT make the LAYLA model responsible for deterministic mathematics.

Use:

MATHEMATICS → reliable calculations

ML → predictions

LAYLA → local AI reasoning, explanation, interpretation and structured recommendation support

OPTIMIZATION → constrained decisions

## Inputs you receive

From Person 3:
```json
{
  "truck": {
    "id": "T102",
    "latitude": 25.2854,
    "longitude": 51.5310,
    "speedKmh": 42
  },
  "batch": {
    "id": "CHK-1029",
    "product": "Fresh Chicken",
    "quantityKg": 500,
    "safeMinTempC": 0,
    "safeMaxTempC": 4,
    "initialShelfLifeHours": 72
  },
  "recentTelemetry": [
    {
      "timestamp": "...",
      "temperatureC": 7.2,
      "humidityPct": 74,
      "latitude": 25.2854,
      "longitude": 51.5310,
      "speedKmh": 42,
      "gForce": 0.2,
      "doorOpen": false,
      "refrigerationOn": true
    }
  ],
  "candidateWarehouses": [
    {
      "id": "WH01",
      "latitude": 25.30,
      "longitude": 51.50,
      "availableCapacityKg": 1200,
      "minTempC": 0,
      "maxTempC": 4
    }
  ]
}
```

## 1. Thermal exposure

Implement:
\[
E_T = \sum_i max(0, T_i - T_{safe}) \Delta t
\]

Return:
```json
{
  "thermalExposure": 42.8,
  "unit": "C*min",
  "exposureMinutes": 18
}
```

Do not hardcode the final risk based only on current temperature.

## 2. Deterioration

Use a configurable temperature-dependent deterioration model.

A prototype can use:
\[
k(T)=A e^{-E_a/(RT)}
\]

and:
\[
D(t)=\int_0^t k(T(	au))d	au
\]

For discrete readings:
\[
D pprox \sum_i k(T_i)\Delta t
\]

Product-specific parameters should be configuration, not scattered constants.

Return:
```json
{
  "deteriorationFraction": 0.184,
  "remainingShelfLifeHours": 38
}
```

Important: this is a prototype model and must not be represented as certified food-safety science.

## 3. Risk score

Combine:
- thermal exposure
- humidity exposure
- product age
- remaining shelf life
- spoilage probability
- route delay
- refrigeration anomalies

Return:
```json
{
  "riskScore": 78,
  "riskLevel": "HIGH"
}
```

Risk levels:
- LOW
- MEDIUM
- HIGH
- CRITICAL

The exact thresholds should be configuration.

## 4. Spoilage prediction

Preferred architecture:
```text
Sensor history
+
Product metadata
+
Deterioration features
+
Exposure features
       ↓
ML predictor
       ↓
P(spoilage)
```

Possible models:
- XGBoost
- Random Forest
- LightGBM
- temporal model if time permits

If no trustworthy labelled real-world dataset is available:
- generate clearly labelled synthetic training data
- document that it is synthetic
- do not claim real-world validation

Output:
```json
{
  "spoilageProbability": 0.73,
  "confidence": 0.91,
  "modelVersion": "prototype-1"
}
```

## 5. Anomaly detection

Use statistical or ML detection.

Example:
\[
z=(x-\mu)/\sigma
\]

Possible:
- Isolation Forest
- change-point detection
- rolling z-score

Detect:
- unusual temperature rise
- unusual cooling behavior
- abnormal door patterns
- unusual GPS behavior

Return:
```json
{
  "anomaly": true,
  "type": "REFRIGERATION_BEHAVIOR",
  "score": 0.91
}
```

## 6. LAYLA local model

Integrate the open-source LAYLA model locally.

The model receives structured facts, NOT raw unlimited sensor history.

Example prompt context:
```json
{
  "product": "Fresh Chicken",
  "temperatureC": 7.2,
  "safeTemperatureC": 4,
  "thermalExposure": 42.8,
  "remainingShelfLifeMinutes": 38,
  "spoilageProbability": 0.73,
  "riskScore": 78,
  "candidateActions": [
    "CONTINUE",
    "DIVERT_TO_WH01",
    "DIVERT_TO_WH02"
  ]
}
```

Use LAYLA for:
- interpreting the event
- explaining risk
- summarizing the evidence
- generating a human-readable recommendation
- identifying relevant factors from structured results

Do NOT let the model invent:
- sensor readings
- shelf-life values
- warehouse capacity
- ETA
- optimization scores
- food-loss quantities

Those must come from backend calculations.

## 7. Optimization

Use Google OR-Tools.

Objective:
\[
min(
C_{transport}
+
C_{foodloss}
+
C_{delay}
)
\]

Constraints:
\[
ETA_j \leq RemainingSafeTime
\]

\[
Quantity \leq WarehouseCapacity_j
\]

\[
T_{warehouse} \in T_{required}
\]

and route feasibility.

Candidate response:
```json
{
  "candidates": [
    {
      "warehouseId": "WH01",
      "etaMinutes": 18,
      "expectedLossPercent": 4.1,
      "transportCost": 143,
      "feasible": true
    }
  ],
  "selectedWarehouseId": "WH01",
  "objectiveValue": 0.18
}
```

## 8. Inventory optimization

Input:
- current inventory
- expiry
- predicted demand
- transfer distance/cost
- store capacity

Compute:
\[
ExpectedExcess =
Inventory - ForecastDemand
\]

Possible actions:
- TRANSFER
- DISCOUNT
- PRIORITIZE_SALE
- REDISTRIBUTE
- CONTINUE

## 9. Demand forecasting

Possible inputs:
- historical sales
- day of week
- holiday
- promotion
- weather if available
- location

Output:
```json
{
  "batchId": "MILK-201",
  "forecast": [
    {"date": "...", "demandKg": 110},
    {"date": "...", "demandKg": 125},
    {"date": "...", "demandKg": 140}
  ],
  "expectedExcessKg": 85
}
```

If time is limited, implement a strong baseline first rather than spending the hackathon training a complex model.

## 10. Food loss engine

Calculate:
\[
FoodSaved =
ExpectedLoss_{withoutIntervention}
-
ExpectedLoss_{withIntervention}
\]

Track:
- predicted loss
- actual/simulated loss
- avoided loss
- food saved
- financial loss
- financial loss prevented
- loss cause

Return:
```json
{
  "predictedLossKg": 1240,
  "lossWithInterventionKg": 380,
  "foodSavedKg": 860,
  "financialLossPrevented": 9800
}
```

## 11. Decision engine

Inputs:
- risk
- remaining shelf life
- spoilage probability
- optimization result
- warehouse feasibility
- inventory state

Possible actions:
- CONTINUE
- MONITOR
- PREPARE_INTERVENTION
- DIVERT
- TRANSFER
- DISCOUNT
- PRIORITIZE_SALE
- REDISTRIBUTE

The decision engine should be deterministic where possible. LAYLA can explain the decision.

## 12. APIs owned by you

```text
GET /api/predictions/{batchId}
GET /api/risk/{batchId}
POST /api/optimization/evaluate
GET /api/optimization/{batchId}
GET /api/analytics/food-loss
GET /api/analytics/inventory
POST /api/ai/explain
GET /api/recommendations/{batchId}
```

## Unified prediction response

Frontend should receive:
```json
{
  "batchId": "CHK-1029",
  "thermalExposure": 42.8,
  "deteriorationFraction": 0.184,
  "remainingShelfLifeHours": 38,
  "spoilageProbability": 0.73,
  "confidence": 0.91,
  "riskScore": 78,
  "riskLevel": "HIGH",
  "anomaly": true,
  "recommendation": {
    "action": "DIVERT",
    "destinationId": "WH01",
    "etaMinutes": 18,
    "expectedLossPercent": 4.1,
    "foodSavedKg": 82,
    "reasoning": "..."
  }
}
```

## Definition of done

1. Receive normalized telemetry from Person 3.
2. Calculate thermal exposure.
3. Calculate deterioration.
4. Estimate remaining shelf life.
5. Calculate risk.
6. Run spoilage prediction.
7. Detect anomalies.
8. Integrate local LAYLA inference.
9. Optimize warehouse destination.
10. Calculate expected food saved.
11. Expose all results through APIs.
12. Provide a clear explanation that separates mathematical outputs from AI-generated text.

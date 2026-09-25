# Person 1 — Live Operational Command Center (NOT OURS)

> Reference only. Person 1 builds everything in this file. Person 2 (this repo) must NOT build any of it.
> Kept here so Person 2 screens avoid overlap and stay consistent with Person 1's data interfaces.

## Goal
Build the live operational command center. When the judge opens the application, this is what they see.

## 1. Main Dashboard
```
┌─────────────────────────────────────────────────────────┐
│ COLD CHAIN COMMAND CENTER                               │
├─────────────────────────────────────────────────────────┤
│ Active Trucks    At Risk    Food Saved    Loss Prevented│
│     12              3        428 kg          QAR 8,420 │
├───────────────────────────────┬─────────────────────────┤
│           LIVE MAP            │     ACTIVE INCIDENTS    │
│     🚚 T01                    │ 🔴 T03 Temperature      │
│              🏭 WH1           │ 🟠 T07 Delay            │
│        🚚 T02                 │                         │
│                    🛒 Store   │                         │
├───────────────────────────────┴─────────────────────────┤
│                    SENSOR MONITORING                    │
│ Temperature ─────────────────────────────               │
│ Humidity    ─────────────────────────────               │
└─────────────────────────────────────────────────────────┘
```

## 2. Live map (React + Leaflet)
Shows trucks, warehouses, hypermarkets, routes, current truck location, risk state, suggested destination.
Truck marker color by backend risk level (never hardcoded):
LOW → green · MEDIUM → yellow · HIGH → orange · CRITICAL → red

## 3. Truck detail page
Clicking a truck shows: product, batch, quantity, temperature, humidity, speed, door, remaining safe time, spoilage probability, risk.
Charts: temperature over time, humidity over time, GPS trajectory, thermal exposure.

## 4. Real-time updates
WebSocket backend `/sensors/live` → truck state → React state → map + charts update.
Judge watches temperature climb (4.1 → 4.8 → 5.7 → 6.8 → 7.4 °C) and sees risk change.

## 5. Incident panel
CRITICAL INCIDENT card: truck, temperature, safe threshold, exposure, remaining safe time, spoilage probability, recommended action (e.g. DIVERT TO WH-01), plus "View reasoning" showing the backend's mathematical/AI explanation.

## 6. Tech stack
React, TypeScript, Tailwind, Leaflet, Recharts, WebSocket, Axios, React Query.

## 7. API contract (defined up front)
```ts
interface Truck {
  id: string;
  latitude: number;
  longitude: number;
  temperature: number;
  humidity: number;
  speed: number;
  riskScore: number;
  riskLevel: string;
}

interface Prediction {
  spoilageProbability: number;
  remainingShelfLife: number;
  thermalExposure: number;
  confidence: number;
}

interface Recommendation {
  action: string;
  destination?: string;
  eta?: number;
  expectedLoss: number;
  foodSaved: number;
  reasoning: string;
}
```

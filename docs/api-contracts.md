# API Contracts — Proposed Additions

The confirmed shapes already in [PERSON_2_FRONTEND_INTELLIGENCE.md](PERSON_2_FRONTEND_INTELLIGENCE.md) are not repeated
here. This document covers only what that spec leaves undefined but the frontend
needs. Everything below is a **proposal** drafted by the frontend, implemented
against mock data, and waiting on backend confirmation — nothing here is final.

Once confirmed, update the "Status" column and mirror any field changes into
[`src/api/dto.ts`](../src/api/dto.ts) plus the matching adapter in
[`src/api/adapters/`](../src/api/adapters/). Screens and components never
import from `dto.ts` directly, so a rename here is a two-file fix, not a
screen rewrite.

| # | Endpoint | Status |
|---|---|---|
| 1 | `/ws/live` message format | Proposed |
| 2 | `GET /api/trucks/{id}/telemetry` | Proposed |
| 3 | `GET /api/analytics/food-loss/series` | Proposed |
| 4 | `GET /api/analytics/scenario-comparison/{scenario}` | Proposed |
| 5 | `POST /api/simulation/stop`, `POST /api/simulation/reset`, `GET /api/simulation/{truckId}` | Proposed |

---

## 1. `/ws/live` message format

The spec lists `/ws/live` as a data source but not its message shape. Per
[docs/PIPELINE.md](PIPELINE.md), this is believed to be the same stream as
Person 1's `/sensors/live` (their spec names that path instead) — **please
confirm these are one stream**, so both frontends subscribe to the same
socket instead of two.

Proposed message, sent once per truck per tick:

```json
{
  "truckId": "T102",
  "sample": {
    "timestamp": "2026-09-25T10:15:30.000Z",
    "temperatureC": 7.2,
    "humidityPercent": 74,
    "doorOpen": false
  }
}
```

## 2. `GET /api/trucks/{id}/telemetry`

Listed as a primary API in the spec's "Data you receive" but no shape given.
Proposed: an array of the same sample shape as the live message, oldest
first, for the Simulation screen's history chart.

```json
[
  { "timestamp": "2026-09-25T10:14:00.000Z", "temperatureC": 4.2, "humidityPercent": 71, "doorOpen": false },
  { "timestamp": "2026-09-25T10:15:00.000Z", "temperatureC": 4.6, "humidityPercent": 72, "doorOpen": false }
]
```

Open question: does this endpoint take a time-range query param (e.g.
`?from=...&to=...`), or always return "since simulation start"? The frontend
currently assumes the latter.

## 3. `GET /api/analytics/food-loss/series`

`GET /api/analytics/food-loss` (already specified) returns one period's
summary numbers. The spec's own chart list — loss over time, by cause, by
product, by warehouse, predicted vs actual — needs time-series and
breakdown data the summary doesn't carry. Proposed as a separate endpoint
so the fast summary call stays cheap:

```json
{
  "overTime": [
    { "date": "2026-09-12", "lostKg": 24, "predictedLostKg": 22 }
  ],
  "byCause": [
    { "label": "Refrigeration Failure", "lostKg": 112 }
  ],
  "byProduct": [
    { "label": "Fresh Chicken", "lostKg": 64 }
  ],
  "byWarehouse": [
    { "label": "WH01 — Doha North", "lostKg": 40 }
  ]
}
```

Also open: should `estimatedFinancialLoss`/`estimatedFinancialLossPrevented`
gain a `co2AvoidedKg` sibling field on the existing summary endpoint (per
docs/PIPELINE.md's Food Loss Engine output), rather than a new endpoint? The
frontend currently treats `co2AvoidedKg` as optional on the existing
`/api/analytics/food-loss` response and shows nothing when it's absent.

## 4. `GET /api/analytics/scenario-comparison/{scenario}`

§6 of the spec asks for "backend-provided counterfactual values" but doesn't
name an endpoint. Proposed:

```json
{
  "scenario": "REFRIGERATION_FAILURE",
  "withoutInterventionLossPercent": 31,
  "withOptimizationLossPercent": 4,
  "foodSavedKg": 82,
  "financialSavedQar": 1763
}
```

## 5. Simulation stop / reset / state

§1 of the spec shows only `POST /api/simulation/start`. "Data you send" also
lists stop and reset, and the frontend needs a way to read current state
(e.g. on page reload, or to know whether to keep polling). Proposed:

- `POST /api/simulation/stop` — body `{ "truckId": "T102" }`
- `POST /api/simulation/reset` — body `{ "truckId": "T102" }`
- `GET /api/simulation/{truckId}` — returns:

```json
{
  "truckId": "T102",
  "batchId": "BEF-2031",
  "scenario": "REFRIGERATION_FAILURE",
  "speedMultiplier": 10,
  "running": true,
  "startedAt": "2026-09-25T10:12:00.000Z"
}
```

All three respond with the same shape as the `GET` above.

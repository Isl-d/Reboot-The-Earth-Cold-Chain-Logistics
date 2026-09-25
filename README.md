# Cold-Chain Data Platform + Intelligence

AI-powered cold-chain management: simulated trucks publish live telemetry, the
platform validates and stores it, a deterministic intelligence layer scores
risk and recommends diversions, and everything is exposed over REST and
WebSocket for the command center.

This repository is **Person 3 (data infrastructure)** and **Person 4
(AI / math / optimization)** in one runnable stack. Every dependency is open
source; there are no paid APIs. The one optional cloud call is an LLM used only
to *explain* code-computed facts — the system works fully offline without it.

---

## Architecture

```
 sensor-simulator/                 backend/                          frontend
 ┌──────────────────┐   MQTT      ┌──────────────────────────┐
 │ Truck physics    │ ─────────▶  │ ingest/consumer.py       │
 │ scenario engine  │  coldchain/ │  validate → normalize →  │
 │ every 2–5 s      │  trucks/+/  │  PostgreSQL + Redis      │
 └──────────────────┘  telemetry  │        │                 │
                     ◀──────────  │        ▼                 │
   control topic      coldchain/  │ intelligence/engine.py   │
  (scenario/pause)    control/+   │  features → anomaly →    │
                                  │  spoilage → risk →       │
                                  │  optimize → decision →   │
                                  │  food-loss               │
                                  │        │                 │
                                  │        ▼                 │
                                  │ REST /api/*  +  /ws/live │ ─────────▶ map,
                                  └──────────────────────────┘            alerts
```

* **Mosquitto** — MQTT broker.
* **PostgreSQL 16** — system of record; `sensor_readings` is a **TimescaleDB**
  hypertable when the extension is available, a plain indexed table otherwise.
* **Redis** — current truck state, latest temperature/location, active alerts,
  latest predictions. If Redis is down the same cache runs in-process.
* **FastAPI** — ingestion, REST, WebSocket.
* **Intelligence layer** — deterministic math plus an optional LLM explainer.

## Quickstart

```bash
cp .env.example .env          # optional; add OPENROUTERAPIKEY to enable the LLM
make demo                     # broker + db + redis + backend + simulator
open http://localhost:8000/docs
```

Then, on stage:

```bash
make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102
make predict BATCH=CHK-1029
make watch                    # raw MQTT traffic
make reset                    # back to NORMAL
make stop
```

### Local development (no Docker)

```bash
python3.12 -m venv .venv && .venv/bin/pip install -r requirements.txt

make dev-backend              # API on the host (needs Postgres/Redis/MQTT)
make dev-sim                  # simulator on the host
make dev-sim-dry              # print 5 simulated readings, no broker
make dev-nobroker             # whole pipeline in-process, no broker/db/docker
make test                     # full test suite (SQLite, no network)
```

`make dev-nobroker` is the fastest way to see data move end to end: it steps
the real simulator physics through the real ingestion pipeline and prints
derived values, risk, incidents and the Person 4 prediction. Add `--ai` to call
the real LLM instead of the offline heuristic:

```bash
.venv/bin/python scripts/dev_no_broker.py --ticks 8 \
    --scenario REFRIGERATION_FAILURE --truck T102 --ai
```

## Data flow

1. **Simulator** (`sensor-simulator/`) reads the same `data/*.csv` the backend
   seeds from, so fleet, routes and batches can never drift apart.
2. **MQTT** carries one JSON message per truck per tick.
3. **Ingestion** (`backend/ingest/`) validates shape, ranges, clock sanity and
   device identity; rejects are written to `ingest_rejects`, never dropped.
4. **Normalization** converts to canonical snake_case and UTC.
5. **Storage**: `sensor_readings` (PostgreSQL/TimescaleDB) + live state (Redis).
6. **Derived values** (`processing.py`): distance, speed, temperature deviation,
   time above threshold, door duration, ETA.
7. **Incidents** (`ingest/incidents.py`): deterministic rules create, update and
   resolve rows; forwarded over the WebSocket.
8. **Intelligence** (`backend/intelligence/`) runs off the hot path in a
   throttled worker and writes `predictions`, which override the baseline risk
   everywhere it is read.

## MQTT contract

Topic `coldchain/trucks/{truckId}/telemetry`:

```json
{
  "deviceId": "TRUCK-T102",
  "truckId": "T102",
  "timestamp": "2026-09-24T16:20:00Z",
  "temperatureC": 7.2,
  "humidityPct": 74,
  "latitude": 25.2854,
  "longitude": 51.531,
  "speedKmh": 42,
  "gForce": 0.2,
  "doorOpen": false,
  "refrigerationOn": true
}
```

The short spellings from the original brief (`temperature`, `humidity`, `lat`,
`lon`, `speed`) are also accepted on ingestion; all outbound payloads stay
camelCase.

Topic `coldchain/trucks/{truckId}/events` carries scenario changes.
Topic `coldchain/control/{truckId}` (or `.../all`) accepts
`{"scenario": "...", "speedMultiplier": 1.0, "paused": false, "reset": false}`.

## WebSocket `/ws/live`

Every reading:

```json
{"event": "TRUCK_STATE_UPDATED", "truckId": "T102", "temperatureC": 7.2,
 "riskScore": 78, "riskLevel": "HIGH", ...}
```

Also emitted: `INCIDENT_CREATED`, `INCIDENT_UPDATED`, `PREDICTION_UPDATED`,
`SIMULATION_EVENT`.

## REST API

**Fleet & reference (Person 3)**

| Method | Path | Description |
|---|---|---|
| GET | `/api/trucks` | live fleet view (position, temperature, risk, incidents) |
| GET | `/api/trucks/{truckId}` | truck + batch + prediction + recommendation |
| GET | `/api/trucks/{truckId}/telemetry` | history, `?from=&to=&limit=` |
| GET | `/api/warehouses` | warehouse reference data |
| GET | `/api/inventory` | inventory by batch |
| GET | `/api/incidents` | incidents, `?status=OPEN&truckId=` |
| POST | `/api/simulation/start` | resume |
| POST | `/api/simulation/stop` | pause |
| POST | `/api/simulation/reset` | reset to NORMAL |
| POST | `/api/simulation/scenario` | `{"truckId","scenario","speedMultiplier"}` |
| GET | `/healthz` | database / redis / mqtt status |

**Intelligence (Person 4)**

| Method | Path | Description |
|---|---|---|
| GET | `/api/predictions/{batchId}` | unified prediction (`?refresh=true` re-runs) |
| GET | `/api/risk/{batchId}` | risk score, level, factors, anomaly |
| POST | `/api/optimization/evaluate` | `{"truckId"}` or `{"batchId"}` |
| GET | `/api/optimization/{batchId}` | warehouse candidates + selection |
| GET | `/api/analytics/food-loss` | predicted / avoided loss and value |
| GET | `/api/analytics/inventory` | forecast, excess, recommended action |
| POST | `/api/ai/explain` | `{"facts"}` or `{"truckId"}` or `{"batchId"}` |
| GET | `/api/recommendations/{batchId}` | action + destination + reasoning |

**Person 3 ↔ Person 4 seam**

| Method | Path | Description |
|---|---|---|
| GET | `/api/internal/context/{truckId}` | normalized context bundle |
| POST | `/api/internal/predictions` | push a prediction (overrides baseline) |

### Unified prediction response

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

## Scenarios

Set per truck over the control topic or `POST /api/simulation/scenario`:

| Scenario | Behaviour |
|---|---|
| `NORMAL` | temperature oscillates inside the safe range |
| `TEMPERATURE_EXCURSION` | drifts above the safe maximum |
| `DOOR_LEFT_OPEN` | door open, warming gradually, humidity falls |
| `REFRIGERATION_FAILURE` | cooling off, warming fast |
| `TRAFFIC_DELAY` | speed collapses, ETA grows |
| `COMBINED_FAILURE` | refrigeration failure + traffic delay |
| `G_FORCE_EVENT` | a handling shock is injected for a few seconds |

## Intelligence model

* **Thermal exposure** `E_T = Σ max(0, T − T_safe) Δt` (°C·min).
* **Deterioration** Arrhenius `k(T) = k_ref · exp(Ea/R · (1/T_ideal − 1/T))`,
  discrete `D = Σ k(T_i) Δt_i`; remaining shelf life `= shelf_life · (1 − D)`.
  `Ea` and humidity limits are per-product configuration in `data/products.csv`.
* **Risk** weighted blend of exposure, shelf life, spoilage, anomaly, delay and
  humidity, with configurable LOW/MEDIUM/HIGH/CRITICAL bands.
* **Anomaly** rolling z-score plus refrigeration / door / GPS / shock rules.
* **Spoilage** deterministic prior; the LLM may move it only within
  `CC_LLM_PROBABILITY_BAND`.
* **Optimization** `min(C_transport + C_foodloss + C_delay)` subject to
  ETA ≤ remaining safe time, quantity ≤ capacity, and warehouse temperature.
  The LLM may rank **feasible** options; an infeasible pick is rejected.
* **Food loss** predicted vs. with-intervention loss, kg and currency.
* **Decision** deterministic action map; the LLM writes the explanation.

> These are prototype models for a hackathon. They are **not** certified
> food-safety science, and the training/demo data is synthetic.

## Configuration

All tunables are `CC_*` environment variables (see `.env.example`). Highlights:

| Variable | Default | Purpose |
|---|---|---|
| `CC_DATABASE_URL` | `postgresql+psycopg://...` | database (SQLite works for dev) |
| `CC_REDIS_URL` | `redis://localhost:6379/0` | live cache |
| `CC_TIMESCALE_ENABLED` | `true` | hypertable when available |
| `CC_READING_INTERVAL_S` | `3` | simulator cadence |
| `CC_INTELLIGENCE_ENABLED` | `true` | run the Person 4 worker |
| `CC_INTELLIGENCE_INTERVAL_S` | `5` | evaluation throttle |
| `CC_LLM_MODEL` | `openrouter/free` | LLM model id |
| `CC_LLM_PROBABILITY_BAND` | `0.35` | LLM spoilage guardrail |
| `OPENROUTERAPIKEY` | – | optional; enables the LLM path |

> `OPENROUTERAPIKEY` is intentionally **not** `CC_`-prefixed. Keep it in
> `.env` (git-ignored) and never commit it.

## Tests

```bash
make test        # or: .venv/bin/python -m pytest tests/ -q
```

The suite runs on SQLite with Redis and MQTT pointed at closed ports — the
offline fallbacks are part of what is tested. The LLM is always mocked, so
tests make no network calls. 84 tests cover validation and rejection logging,
normalization, derived values, incident rules, risk bands, simulator physics,
the REST/WebSocket contract, and every deterministic intelligence model.

## Layout

```
backend/
  ingest/        MQTT consumer, validation, normalization, incident rules
  routers/       REST endpoints (trucks, telemetry, simulation, intelligence, ...)
  intelligence/  features, anomaly, spoilage, risk, optimization, decision, LLM
  context.py     the normalized Person 3 → Person 4 bundle
  processing.py  derived values    risk.py  baseline risk
  models.py      SQLAlchemy models  cache.py  Redis (+ in-process fallback)
  db.py seed.py ws.py main.py
sensor-simulator/  simulator, scenario engine, fleet definitions
data/              reference CSVs (seeded by the backend and read by the simulator)
db/schema.sql      reference DDL
scripts/           dev_no_broker.py
tests/             pytest suite
```
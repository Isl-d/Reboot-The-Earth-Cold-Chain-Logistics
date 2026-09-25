# Architecture — Thermal Trace

> Single source of truth for the system architecture. If this document and any
> other file disagree, this document wins. Domain objects live in
> [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md); wire shapes live in
> [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md); the full component-by-component
> reference and thesis live in [`AI_COLD_STORAGE_LOGISTICS.md`](AI_COLD_STORAGE_LOGISTICS.md).

## 1. What the system is

**Condition-aware cold-chain decision system.** Simulated refrigerated trucks
publish live sensor telemetry (temperature, humidity, GPS, speed, G-force, door,
refrigeration), the platform validates and stores it, and a deterministic
intelligence layer measures the thermal condition of each batch, predicts
spoilage and remaining shelf life, optimizes a warehouse diversion, turns that
into one decision, and quantifies the food saved — all exposed over REST and a
single WebSocket stream so a command center can watch the fleet, the
intelligence chain, and the food-loss outcome update live. An optional LLM
(explainer) only *explains* code-computed facts and may never invent numbers; the
system is fully functional offline without it.

- **Stack:** Python 3.12 / FastAPI, PostgreSQL 16 (TimescaleDB when available) +
  Redis, Mosquitto MQTT, React 19 + TypeScript + Tailwind 4 + Leaflet + Recharts
  for the UI.
- **Data:** every reference fact is seeded from `data/*.csv`; the simulator
  reads the same CSVs so fleet, routes and batches can never drift apart.
- **Currency:** **QAR** everywhere going forward.

## 2. Layered view

```
┌────────────────────────────────────────────────────────────────────────────┐
│ FRONTEND — frontend/ (React 19, TypeScript, Tailwind 4, Leaflet, Recharts) │
│   Command center (Person 1) + intelligence screens merged from Person 2   │
│   Fleet · live map · truck detail · incidents · Simulation · Model ·       │
│   Optimization · Food-Loss · Inventory · Scenario Comparison               │
└───────────────┬───────────────────────────────────────────┬────────────────┘
                │ REST  /api/*                              │ WebSocket /ws/live
                ▼                                           ▼
┌────────────────────────────────────────────────────────────────────────────┐
│ FASTAPI BACKEND — backend/main.py                                          │
│   routers/    trucks · telemetry · warehouses · inventory · incidents ·    │
│              routes · simulation · internal · intelligence · model · events│
│   ws.py       connection manager, fan-out to /ws/live                      │
└───────────────┬───────────────────────────────────────────┬────────────────┘
                │ hot path                                  │ off hot path
                ▼                                           ▼
┌───────────────────────────────────┐   ┌────────────────────────────────────┐
│ DATA LAYER — backend/ingest/      │   │ INTELLIGENCE —                       │
│   consumer.py  MQTT → validate →  │   │ backend/intelligence/               │
│     normalize → store → incidents │   │   features → anomaly → spoilage →   │
│   processing.py derived values    │   │   risk → optimization → decision →  │
│   risk.py       baseline risk     │   │   food-loss → unified response      │
└───────────────┬───────────────────┘   └──────────────────┬─────────────────┘
                │                                          │
                ▼                                          ▼
┌───────────────────────────────────┐   ┌────────────────────────────────────┐
│ PostgreSQL 16 / TimescaleDB       │   │ Redis 7                              │
│   system of record                │   │   live cache: truck state, latest    │
│   sensor_readings = hypertable    │   │   reading, active incidents, latest  │
│   + ingest_rejects, predictions   │   │   predictions (in-process fallback)  │
└───────────────▲───────────────────┘   └──────────────────────────────────────┘
                │ MQTT
┌───────────────┴────────────────────────────────────────────────────────────┐
│ MOSQUITTO — MQTT broker                                                    │
│   coldchain/trucks/{truckId}/telemetry   (sensor → backend)                │
│   coldchain/trucks/{truckId}/events      (device events → backend)         │
│   coldchain/control/{truckId} | /all     (backend → simulator)             │
└───────────────▲────────────────────────────────────────────────────────────┘
                │ publish telemetry / subscribe control
┌───────────────┴────────────────────────────────────────────────────────────┐
│ SENSOR SIMULATOR — sensor-simulator/                                       │
│   simulator.py  truck physics · fleet.py reads data/*.csv ·               │
│   scenarios.py  NORMAL, TEMPERATURE_EXCURSION, DOOR_LEFT_OPEN,             │
│                 REFRIGERATION_FAILURE, TRAFFIC_DELAY, COMBINED_FAILURE,    │
│                 G_FORCE_EVENT                                              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Direction of flow:** simulator → MQTT → ingestion (validate/normalize/store) →
PostgreSQL + Redis → intelligence worker → predictions → REST + WebSocket →
frontend. Simulation control flows the other way: frontend → REST →
`/api/simulation/*` → MQTT control topic → simulator.

## 3. Reasoning pipeline (Data → Food Loss → UI)

Each stage maps to an exact file. Deterministic math is always in code; the LLM
is only an explainer at the edges and is bounded by guardrails.

| Stage | What happens | File(s) |
|---|---|---|
| **Data** | Simulator publishes telemetry; MQTT consumer validates shape/ranges/clock/device, normalizes to snake_case + UTC, writes `sensor_readings`, updates Redis, reconciles incidents, emits `TRUCK_STATE_UPDATED` | `sensor-simulator/simulator.py`, `sensor-simulator/scenarios.py`, `sensor-simulator/fleet.py`; `backend/ingest/consumer.py`, `backend/ingest/validate.py`, `backend/ingest/normalize.py`, `backend/ingest/incidents.py`; `backend/processing.py`; `backend/models.py`; `data/*.csv` |
| **Condition** | Compute thermal exposure `E_T = Σ max(0, T − T_safe)Δt`, Arrhenius deterioration, remaining shelf life, humidity/door/shock exposure, anomaly; blend baseline risk factors | `backend/intelligence/features.py`, `backend/intelligence/anomaly.py`, `backend/risk.py` (baseline), `backend/intelligence/risk.py` |
| **Prediction** | Deterministic spoilage prior + confidence; explainer may move the probability only inside `CC_LLM_PROBABILITY_BAND`; unified result assembled | `backend/intelligence/spoilage.py`, `backend/intelligence/engine.py` |
| **Optimization** | Enumerate candidate warehouses, compute ETA (haversine), feasibility (temp envelope, capacity, ETA ≤ remaining safe time), objective `min(C_transport + C_foodloss + C_delay)`; explainer may only rank feasible options | `backend/intelligence/optimization.py`, `backend/geo.py` |
| **Decision** | Deterministic action map from risk level + feasibility → `CONTINUE` / `MONITOR` / `PREPARE_INTERVENTION` / `DIVERT` | `backend/intelligence/decision.py` |
| **Food Loss** | `FoodSaved = ExpectedLoss(without) − ExpectedLoss(with)`, kg and QAR; CO₂ avoided derived on the analytics endpoint | `backend/intelligence/foodloss.py`, `backend/routers/intelligence.py` |
| **UI** | REST routes return the stored/unified result; the engine writes `predictions` and broadcasts `PREDICTION_UPDATED`; frontend renders, never computes | `backend/routers/*.py`, `backend/ws.py`, `backend/intelligence/engine.py`; `frontend/` |

The full engine entry point is `backend/intelligence/engine.py`
(`evaluate_context` → `evaluate_truck`), throttled off the hot path by
`backend/intelligence/worker.py` and triggered by `mark_dirty` from the
consumer. The single Person 3 → Person 4 seam is `backend/context.py`
(`build_context`), used by both the worker and
`GET /api/internal/context/{truckId}`.

### Two AI layers (System 1 / System 2)

The deterministic core is the authority. Two AI layers sit around it:

- **Laya — System 1, local, offline, free (Apache-2.0, Convai Innovations).**
  `backend/intelligence/laya.py` posts the structured cold-chain state to the
  `laya` service (`laya-serve`, Jev-compatible `POST /v1/systemone`) and gets
  back typed answers (`condition`, `recommended_action`, `urgency`,
  `needs_human_review`) with confidence in a single forward pass. It **never
  generates text**, so it cannot invent a number, and it **corroborates** the
  deterministic decision rather than replacing it. Optional and fail-safe: if
  the service is down, the block is simply absent and the engine is unchanged.
- **Explainer — System 2, cloud.** `backend/intelligence/llm.py` (OpenRouter
  `deepseek/deepseek-v4.1-flash`) writes the prose over the same computed facts,
  bounded by `CC_LLM_PROBABILITY_BAND`.

The unified result carries the System-1 read under `system1` (provenance
`PREDICTED`), served at `GET /api/system1/{truckId}` and shown on the Model
screen. Base checkpoints ship over-confident, so confidence is labelled
*uncalibrated* until refit on our own data.

## 4. Canonical directory layout

```
sensor-simulator/          The only simulator. Truck physics + scenario engine.
  simulator.py             MQTT publish loop, control-topic handler.
  fleet.py                 Reads data/*.csv → trucks/routes/products/batches.
  scenarios.py             7 scenario parameter sets + target resolution.

backend/                   FastAPI app + data platform + intelligence.
  main.py                  App, lifespan (init_db, seed, MQTT, worker), /ws/live.
  config.py                Every CC_* tunable. No secrets.
  models.py                SQLAlchemy domain tables (see docs/DOMAIN_MODEL.md).
  schemas.py               Pydantic wire contracts (telemetry, prediction, scenario).
  context.py               build_context(): the Person 3 → Person 4 bundle.
  processing.py            Derived values from the telemetry stream.
  risk.py                  Baseline risk bands (pre-intelligence).
  geo.py                   Haversine / route interpolation — STILL USED.
  cache.py                 Redis live cache (+ in-process fallback).
  db.py                    Engine/session/health.
  seed.py                  Idempotent seed from data/*.csv.
  ws.py                    WebSocket connection manager + fan-out.
  ingest/                  The only ingestion path.
    consumer.py            MQTT → validate → normalize → store → incidents → WS.
    validate.py            Shape/range/clock/device checks; reject reasons.
    normalize.py           Canonical snake_case + UTC; wire conversion.
    incidents.py           Pure deterministic incident rules.
  intelligence/            Person 4 engine, runs off the hot path.
    engine.py              evaluate_context / evaluate_truck / _persist.
    features.py            Thermal exposure + Arrhenius deterioration.
    anomaly.py             Rolling z-score + refrigeration/door/GPS/shock rules.
    spoilage.py            Deterministic prior + guarded explainer adjustment.
    risk.py                Weighted risk blend, floors, bands.
    optimization.py        Warehouse diversion objective + feasibility.
    decision.py            Deterministic action map.
    foodloss.py            Predicted vs with-intervention loss (kg + value).
    forecasting.py         Demand forecast for inventory.
    inventory_opt.py       Inventory action recommendation.
    llm.py                 explainer client (OpenRouter / local); offline fallback.
    laya.py                System 1 client (laya-serve HTTP) + cold-chain question sheet.
    worker.py              Throttled background evaluation worker.
  routers/                 REST surface (one module per resource).
    trucks.py telemetry.py warehouses.py inventory.py incidents.py
    routes.py simulation.py internal.py intelligence.py model.py events.py
    opendata.py common.py

data/                      Reference CSVs seeded by backend & read by simulator.
  warehouses.csv trucks.csv products.csv product_batches.csv inventory.csv
  routes.csv routes.geojson stores.csv
  opendata/                Licence catalogue + provenance, served by GET /api/opendata.
mosquitto/                 mosquitto.conf.
scripts/                   dev_no_broker.py (whole pipeline, no broker/db).
tests/                     pytest suite (SQLite; Redis/MQTT closed; LLM mocked).
frontend/                  The merged app: React 19 + Tailwind 4 + Leaflet.
                           Command center (Person 1) + intelligence screens.
laya/                      Container for Laya, the local System-1 decision engine.
  Dockerfile               python:3.12-slim + `laya[serve]`; preloads checkpoints.
docker-compose.yml         mosquitto · timescaledb · redis · backend · simulator
                           · frontend (:5173, proxying to backend :8000).
Makefile                   Every on-stage command. `make demo` is the demo.
requirements.txt .env.example
```

## 5. Legacy / retired

The original ColdGuard code **lives under `legacy/`** (see
[`legacy/README.md`](legacy/README.md)). Nothing in the canonical stack
(`backend/`, `sensor-simulator/`, `frontend/`, `scripts/`, `tests/`, `data/`)
imports from it, and `make test` does not collect it. It is kept for reference,
not to build on.

| Path under `legacy/` | Why it is retired |
|---|---|
| `web/` | Earlier Vite frontend. Superseded by `frontend/` (merged Person 1 + Person 2). |
| `simulator/sim.py` | Earlier single-file simulator. Superseded by `sensor-simulator/` reading the shared `data/*.csv`. |
| `backend/agent.py` | Dead ColdGuard module. Superseded by `backend/intelligence/llm.py` (explainer). |
| `backend/audit.py` | Dead ColdGuard module. Not needed for the demo. |
| `backend/detector.py` | Superseded by `backend/ingest/incidents.py` + `backend/intelligence/anomaly.py`. |
| `backend/freshness.py` | Superseded by `backend/intelligence/features.py` + `spoilage.py`. |
| `backend/planner.py` | Superseded by `backend/intelligence/optimization.py` + `decision.py`. |
| `backend/state.py` | Superseded by `backend/cache.py` + `backend/processing.py`. |
| `backend/ingest.py` | Old ingest module (was shadowed by the `backend/ingest/` package). Superseded by the package. |
| `backend/templates/track.html` | Server-rendered QR page. Dropped. |
| `db/schema.sql` | Old reference DDL. Superseded by `backend/models.py` + `create_all`. |
| `tests/`, `tests/traces/` | Tests for the above. Superseded by the canonical `tests/`. |

The earlier `coldchain/` package has likewise been retired to `legacy/coldchain/`
(it duplicated the Person 3 pipeline). Its open-data catalogue is the one part
still used: those assets now live in `data/opendata/` and are served by
`GET /api/opendata`. Nothing in the canonical stack imports `legacy/coldchain/`.

> **Not legacy:** `backend/geo.py` is live — imported by
> `backend/processing.py`, `backend/intelligence/features.py` and
> `backend/intelligence/optimization.py`. Do not remove it.

The standalone Person 2 app (root `src/` plus its Vite/Tailwind config) has
likewise been retired to `legacy/person2-frontend/`: its intelligence screens
are now merged into `frontend/` (React 19 · Tailwind 4 · Leaflet · Recharts),
which is the single UI.

## 6. The one obvious way to run the demo

```bash
make demo
```

This is the canonical demo. It runs `docker compose up -d --build`, starting
Mosquitto, TimescaleDB/PostgreSQL, Redis, the FastAPI backend, the simulator,
and the frontend in one command.

- API: <http://localhost:8000/api/trucks> (backend is published on host `8000`;
  see `docker-compose.yml`)
- WebSocket: `ws://localhost:8000/ws/live`
- Frontend: <http://localhost:5173> (Vite dev server proxying `/api` and `/ws`
  to the backend on `8000`)
- Docs: <http://localhost:8000/docs>

On-stage helpers: `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102`,
`make predict BATCH=CHK-1029`, `make watch`, `make reset`, `make stop`.

Offline variants: `make dev-nobroker` (whole pipeline in process, no broker/db/
Docker), `make dev-backend`, `make dev-sim`, `make test`.

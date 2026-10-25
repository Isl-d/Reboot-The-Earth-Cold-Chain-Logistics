# Architecture — Thermal Trace

> Single source of truth for the system architecture. If this document and any
> other file disagree, this document wins. Domain objects live in
> [`docs/DOMAIN_MODEL.md`](docs/DOMAIN_MODEL.md); wire shapes live in
> [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md); why the system is built this
> way, and its limits, are in [§7](#7-design-decisions-and-limits).

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

**A real sensor node** (`firmware/node/`, NodeMCU + DHT11) can take one truck's
place, T101 by default. It publishes the same message on the same topic, so
nothing downstream changes; `CC_REAL_TRUCKS=T101` tells the simulator to leave
that truck alone. `tests/test_firmware.py` holds the node to the contract.

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

Inventory runs beside the chain: `forecasting.py` forecasts demand, and
`inventory_opt.py` maps `ExpectedExcess = Inventory − ForecastDemand` to one of
`CONTINUE`, `TRANSFER`, `DISCOUNT`, `PRIORITIZE_SALE` or `REDISTRIBUTE`.

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
  control.html             Standalone manual-control panel, served at /control.
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
  routes.csv stores.csv    (route waypoints also draw the map's route lines)
  opendata/                Licence catalogue + provenance, served by GET /api/opendata.
scripts/                   dev_no_broker.py (whole pipeline, no broker/db) ·
                           present.py (the on-stage timeline, `make present`).
tests/                     pytest suite (SQLite; Redis/MQTT closed; LLM mocked).
frontend/                  The merged app: React 19 + Tailwind 4 + Leaflet.
                           Command center (Person 1) + intelligence screens.
firmware/node/             NodeMCU + DHT11 sensor node; publishes as T101.
laya/                      Container for Laya, the local System-1 decision engine.
  Dockerfile               python:3.12-slim + `laya[serve]`; preloads checkpoints.
docker-compose.yml         mosquitto · timescaledb · redis · backend · simulator
                           · frontend (:5173, proxying to backend :8000).
                           The broker config is inline (`configs:`).
Makefile                   Every on-stage command. `make demo` is the demo.
requirements.txt .env.example
```

### Where a new file goes

| If it… | Put it in |
|---|---|
| computes a number from telemetry | `backend/intelligence/` |
| moves, stores, validates or serves data | `backend/ingest/`, `backend/routers/` |
| is a new sensor or scenario | `sensor-simulator/` |
| draws one thing on screen | `frontend/src/` |
| is reference data | `data/` |
| pins behaviour the demo depends on | `tests/` |

## 5. Retired code

Earlier versions were deleted once the current tree replaced them: the original
ColdGuard backend, simulator and dashboard; the standalone `coldchain/` service;
and the standalone Person 2 app, whose screens now live in `frontend/`. There is
one backend (`backend/`), one simulator (`sensor-simulator/`) and one app
(`frontend/`). Recover anything retired from git history at commit `15650c9`.
The open-data catalogue from `coldchain/` lives on in `data/opendata/`, served
by `GET /api/opendata`.

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

## 7. Design decisions and limits

### Where AI is used, and where it is not

Deterministic code owns every number. A non-generative model may make the fast
call; a generative model may only explain it, and can never introduce a number.

| Task | Method | Why this method | File |
|---|---|---|---|
| Thermal exposure, deterioration, shelf life | Deterministic physics | Must be exact, reproducible and auditable | `features.py` |
| Risk | Weighted blend with floors | Safety-critical; every factor is visible | `intelligence/risk.py` |
| Anomaly | Rolling z-score + rules | Needs no labelled data, explainable, cheap enough for every tick | `anomaly.py` |
| Spoilage | Deterministic prior | Gives a sane value with no model at all | `spoilage.py` |
| Warehouse choice | Optimization | A cost objective must be solved, not narrated | `optimization.py` |
| Demand | Lightweight statistical forecast | Enough for inventory advice, and explainable | `forecasting.py` |
| Fast typed call + confidence | Laya (System 1) | Cannot emit free text, so cannot fabricate a number | `laya.py` |
| Explanation | Explainer LLM (System 2) | Language is the one job where an LLM adds value, not risk | `llm.py` |

The worker's stored and displayed numbers are always deterministic
(`evaluate_truck` ignores `use_llm`). The explainer writes prose at
`POST /api/ai/explain`; with no key or no provider it falls back to a template
explanation over the same facts.

### Constants

- **Spoilage prior:** `0.4·(1 − e^(−3D)) + 0.6·(1 − e^(−E_T / E50))`, with
  `E50 = 15 °C·min` (`backend/config.py`).
- **Risk weights:** spoilage 0.30, thermal exposure 0.20, remaining shelf life
  0.20, anomaly 0.15, route delay 0.10, humidity 0.05. Floors stop one strong
  signal being averaged away: 4 °C above the safe maximum floors the score at
  CRITICAL, 2 °C at HIGH (`backend/intelligence/risk.py`).
- Product constants (`Ea`, safe range, humidity limit) in `data/products.csv`
  are literature values; the reference set behind them,
  `data/opendata/product_reference.csv`, is marked `verified=no`. A pilot
  calibrates them per product.

### Degrade, never crash

| When | The system does this |
|---|---|
| Redis is unreachable | Runs the same cache in process (`backend/cache.py`) |
| The TimescaleDB extension is absent | `sensor_readings` is a plain indexed table; behaviour is identical |
| Laya is down | The `system1` block is absent; the pipeline is unchanged |
| There is no explainer key or provider | Template explanation; every number is identical |
| A reading fails validation | It is written to `ingest_rejects` with a reason, never dropped |

The intelligence worker runs off the ingest hot path, so a slow model never
stalls telemetry.

### Deliberately not used

Kubernetes, Kafka, separate microservices and object storage. None is needed at
this scale, and each adds failure modes and cost. The intelligence engine is a
module inside the one FastAPI process, separated by folder, not a service.

### Limits

- Food-science parameters are prototype calibrations, not certified thresholds.
- The demo fleet and its telemetry are synthetic and labelled `SYNTHETIC`.
- Laya's base checkpoints are near chance on decision schemas unlike their
  training data, and over-confident. They corroborate the deterministic
  decision, never override it, and their confidence is shown as uncalibrated
  until fine-tuned on cold-chain decisions.
- The explainer cannot move a number outside `CC_LLM_PROBABILITY_BAND` or pick
  an infeasible warehouse.
- No personal data is processed; the models see only structured operational
  facts.

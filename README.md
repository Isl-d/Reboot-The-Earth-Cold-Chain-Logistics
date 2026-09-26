<p>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/lockup-dark.png" />
    <img alt="Thermal Trace" src="docs/brand/lockup-light.png" width="360" />
  </picture>
</p>

# Thermal Trace

AI cold-chain management & food-loss prevention.

**Pitch deck:** [docs/deck/index.html](docs/deck/index.html) (open in a browser; PDF at
[docs/deck/thermal-trace-pitch.pdf](docs/deck/thermal-trace-pitch.pdf)). Brand rules and logo files:
[docs/brand/](docs/brand/README.md).

**Open source** under the [MIT licence](LICENSE). Built on open technology
(Mosquitto, PostgreSQL, Redis, FastAPI, React, an Apache-2.0 local model) and
17 openly licensed data sources; the whole stack runs offline on one laptop.

**UN Sustainable Development Goals:** SDG **12.3** (halve food waste and cut
food loss along supply chains), SDG **2** (zero hunger, food security) and
SDG **13** (climate action: CO₂ avoided is reported for every intervention).

A condition-aware cold-chain decision system. Simulated refrigerated trucks
publish live telemetry; the platform validates and stores it; deterministic
mathematics measures how much thermal exposure and deterioration the cargo has
accumulated; ML estimates spoilage risk; an optimizer evaluates nearby cold
stores; a decision engine recommends an intervention; a food-loss engine proves
what that intervention saved — and a single React app shows all of it.

The product loop is:

```
Sensors say what is happening
   -> mathematics says how much exposure/deterioration has occurred
   -> prediction says what may happen next
   -> optimization says which action minimizes expected loss
   -> the decision engine turns that into an operational action
   -> the food-loss engine measures the value of that action
```

For the full component-by-component reference, the data/AI split, and the thesis
behind it, see **[pitch/AI_COLD_STORAGE_LOGISTICS.md](pitch/AI_COLD_STORAGE_LOGISTICS.md)**.

## One command

```bash
cp .env.example .env      # optional; add an OpenRouter key to enable the explainer
make demo                 # broker + db + redis + backend + simulator + frontend
```

Then open **http://localhost:5173** (dashboard) and **http://localhost:8000/docs**
(API). The whole stack runs offline; the only optional network call is the LLM
used to *explain* code-computed facts.

### The stage scenario (refrigeration failure)

```bash
make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102
make predict  BATCH=CHK-1029
make reset
make stop
```

Truck T102 carries 500 kg of fresh chicken (safe 0–4 °C). Cooling stops, the
cargo warms, thermal exposure accumulates, risk climbs, an incident opens, the
optimizer compares WH01/WH02/WH03, the decision engine recommends `DIVERT`, and
the food-loss panel shows the kg and QAR saved. See [pitch/DEMO_SCRIPT.md](pitch/DEMO_SCRIPT.md).

### Local development (no Docker)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

make dev-nobroker   # whole pipeline in-process, no broker/db/docker
make dev-backend    # API on the host        (needs Postgres/Redis/MQTT)
make dev-sim        # simulator on the host
make dev-web        # frontend on the host   (needs the backend on :8000)
make test           # full pytest suite (SQLite, no network)
```

## Manual control (outside the app)

**http://localhost:8000/control** — a standalone panel to drive any truck by
hand. Pick a truck and set its temperature, humidity, speed, g-force, door and
refrigeration; press **Apply manual**. Manual mode pauses the simulator for that
truck and feeds your exact values through the *same* pipeline, so every derived
number stays a deterministic function of the reading. `GET/POST/DELETE
/api/simulation/manual` is the API behind it. (`make control` prints the URL.)

## Architecture

```
frontend/                      REST + WebSocket               backend/                       MQTT            sensor-simulator/
┌──────────────────────┐      ┌──────────────────┐      ┌──────────────────────────┐     ┌──────────┐    ┌──────────────┐
│ Command Center        │ ◀──▶ │ /api/*           │ ◀──▶ │ ingest/  validate        │ ◀── │ Mosquitto│ ◀─ │ simulator.py │
│ (Fleet, Map, Truck)   │      │ /ws/live         │      │ normalize → Postgres     │     │ 1883     │    │ scenarios.py │
│ Intelligence          │      └──────────────────┘      │ → Redis → incidents      │     └──────────┘    │ fleet.py     │
│ (Model, Optimization, │                                │ intelligence/            │                     └──────┬───────┘
│  Food-loss, Inventory)│                                │ features → anomaly →     │                            │ reads
└──────────────────────┘                                 │ spoilage → risk →        │                            ▼
                                                          │ optimization → decision  │                     data/*.csv
                                                          │ → food loss → explainer      │
                                                          └──────────────────────────┘
```

Layer discipline: `data/` → `backend/ingest/` → `backend/intelligence/` (condition →
prediction → optimization → decision → food loss) → `backend/routers/` → `frontend/`.
See [ARCHITECTURE.md](ARCHITECTURE.md) for the full map and
[docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md) for the objects.

## Repository layout

| Path | What it is |
|---|---|
| `backend/` | FastAPI app: ingestion, REST, WebSocket, intelligence (Persons 3 + 4) |
| `sensor-simulator/` | Truck physics + scenario engine, reads `data/*.csv` |
| `frontend/` | The one React app: command center **and** intelligence screens |
| `landing/` | Marketing/landing page (React + three.js) that reads the same live backend |
| `laya/` | Container for the local System-1 decision engine (`laya-serve`) |
| `data/` | Reference CSVs (trucks, products, batches, warehouses, routes, inventory) + `opendata/` catalogue |
| `tests/` | pytest suite, including the end-to-end demo test |
| `legacy/` | Retired code kept for reference (`web/`, `simulator/`, `coldchain/`, `person2-frontend/`, old ColdGuard modules) |
| `docs/` | thesis, API contract, domain model, design, person specs |
| `firmware/`, `pitch/`, `example/`, `mdfile/` | Hardware, pitch deck, references |

Anything in `legacy/` is dead; the canonical stack never imports it.

## Data flow

1. **Simulator** publishes one JSON message per truck per tick on
   `coldchain/trucks/{truckId}/telemetry` (+ typed `.../events` on transitions).
2. **Ingestion** (`backend/ingest/`) validates shape, ranges, clock sanity and
   device identity. Rejects are written to `ingest_rejects`, never dropped.
3. **Storage**: `sensor_readings` (PostgreSQL/TimescaleDB) + live state (Redis,
   with an in-process fallback).
4. **Derived values** (`backend/processing.py`): distance, speed, deviation,
   time-above-threshold, door duration, ETA.
5. **Incidents** (`backend/ingest/incidents.py`): deterministic rules, forwarded
   over the WebSocket.
6. **Intelligence** (`backend/intelligence/`) runs off the hot path in a throttled
   worker and writes `predictions`, which override the baseline risk everywhere.

## MQTT contract

Telemetry — `coldchain/trucks/{truckId}/telemetry`:

```json
{"deviceId":"TRUCK-T102","truckId":"T102","timestamp":"2026-09-24T16:20:00Z",
 "temperatureC":7.2,"humidityPct":74,"latitude":25.2854,"longitude":51.531,
 "speedKmh":42,"gForce":0.2,"doorOpen":false,"refrigerationOn":true}
```

Device events — `coldchain/trucks/{truckId}/events`:

```json
{"deviceId":"TRUCK-T102","truckId":"T102","timestamp":"2026-09-25T09:00:00Z",
 "type":"DOOR_OPENED","detail":"lid lifted","value":null}
```

Types: `DOOR_OPENED`, `DOOR_CLOSED`, `REFRIGERATION_ON`, `REFRIGERATION_OFF`,
`SHOCK`, `POWER_LOST`, `POWER_RESTORED`, `SENSOR_FAULT`, `SCENARIO_CHANGED`.
Unknown types are rejected with a reason.

Control — `coldchain/control/{truckId}` (or `.../all`) accepts
`{"scenario":"...","speedMultiplier":1.0,"paused":false,"reset":false}`.
`speedMultiplier` scales how fast the truck moves along its route.

## WebSocket `/ws/live`

On connect the first frame is `HELLO` with the current fleet, then:

`TRUCK_STATE_UPDATED`, `INCIDENT_CREATED`, `INCIDENT_UPDATED`,
`PREDICTION_UPDATED`, `RECOMMENDATION_UPDATED`, `FOOD_LOSS_UPDATED`,
`DEVICE_EVENT`.

## REST API

**Fleet & reference (Person 3)**

| Method | Path | Description |
|---|---|---|
| GET | `/api/trucks` | live fleet view, `{trucks:[...]}` |
| GET | `/api/trucks/{truckId}` | truck + batch + prediction + recommendation |
| GET | `/api/trucks/{truckId}/telemetry` | history, `?from=&to=&limit=` |
| GET | `/api/trucks/{truckId}/events` | device events (oldest first) |
| GET | `/api/device-events` | device events across the fleet |
| GET | `/api/warehouses` · `/api/inventory` | reference data, `{inventory:[...]}` |
| GET | `/api/incidents` | incidents, `?status=OPEN&truckId=` |
| POST | `/api/simulation/start\|stop\|reset\|scenario` | demo control |
| GET | `/healthz` | database / redis / mqtt status |

**Intelligence (Person 4)**

| Method | Path | Description |
|---|---|---|
| GET | `/api/predictions/{batchId}` | unified prediction (`?refresh=true` re-runs) |
| GET | `/api/risk/{batchId}` | risk score, level, factors, anomaly |
| GET | `/api/model/{truckId}/thermal-exposure\|deterioration\|spoilage` | model chain |
| GET | `/api/system1/{truckId}` | local Laya System-1 read + the deterministic decision |
| POST | `/api/optimization/evaluate` | `{"truckId"}` or `{"batchId"}` |
| GET | `/api/optimization/{batchId}` | warehouse candidates + selection |
| GET | `/api/analytics/food-loss` · `/series` | predicted / avoided loss and value |
| GET | `/api/analytics/scenario-comparison/{scenario}` | without vs with intervention |
| GET | `/api/analytics/inventory` | forecast, excess, recommended action |
| POST | `/api/ai/explain` | `{"facts"}` or `{"truckId"}` or `{"batchId"}` — routed, guarded, grounded, cited |
| POST | `/api/ai/triage` | `{"message"}` — System-1 operator triage |
| POST | `/api/ai/moderate` | `{"text"}` — System-1 output moderation |
| GET | `/api/ai/grounding` | `?q=` — retrieved, cited passages (no vector DB) |
| POST | `/api/actions/execute` | execute an action (`DIVERT`, `ACKNOWLEDGE`, `PRIORITIZE_SALE`, …) |
| POST | `/api/actions/auto/{truckId}` | auto-pilot: execute the engine's own recommendation |
| GET | `/api/actions` | recent executed actions (audit trail) |
| GET | `/api/recommendations/{batchId}` | action + destination + reasoning |

**Person 3 ↔ Person 4 seam**

| Method | Path | Description |
|---|---|---|
| GET | `/api/internal/context/{truckId}` | normalized context bundle |
| POST | `/api/internal/predictions` | push a prediction (overrides baseline) |

Exact JSON for every endpoint is in [docs/API_CONTRACT.md](docs/API_CONTRACT.md).

## Intelligence model

* **Thermal exposure** `E_T = Σ max(0, T − T_safe) Δt` (°C·min).
* **Deterioration** Arrhenius `k(T) = k_ref · exp(Ea/R · (1/T_ideal − 1/T))`,
  discrete `D = Σ k(T_i) Δt_i`; remaining shelf life `= shelf_life · (1 − D)`.
  `Ea` and humidity limits are per-product configuration in `data/products.csv`.
* **Risk** weighted blend of exposure, shelf life, spoilage, anomaly, delay and
  humidity, with critical floors and configurable bands.
* **Anomaly** rolling z-score plus refrigeration / door / GPS / shock rules.
* **Spoilage** deterministic prior; the LLM may move it only within
  `CC_LLM_PROBABILITY_BAND`. With no key it stays `heuristic`.
* **Optimization** `min(C_transport + C_foodloss + C_delay)` subject to
  ETA ≤ remaining safe time, quantity ≤ capacity, and warehouse temperature.
  The LLM may rank **feasible** options; an infeasible pick is rejected.
* **Decision** deterministic action map (`CONTINUE`, `MONITOR`,
  `PREPARE_INTERVENTION`, `DIVERT`); the LLM writes the explanation.
* **Food loss** `lossWithout = clamp(deterioration + spoilageProbability)`,
  `lossWith = min(lossWithout, selected candidate's expected loss)`,
  `foodSaved = (lossWithout − lossWith) · quantity`. Currency is **QAR**.

> These are prototype models for a hackathon. They are **not** certified
> food-safety science, and the training/demo data is synthetic.

### Two AI layers

| Layer | Runs | Job | Constraint |
|---|---|---|---|
| **Laya** (System 1) | local, `laya` compose service, Apache-2.0 | typed decisions + confidence from the cold-chain state | **never generates text**; corroborates the deterministic decision, never overrides it |
| **Explainer** (System 2) | cloud, OpenRouter `deepseek/deepseek-v4.1-flash` | turns the computed facts into prose | may only move the spoilage estimate within `CC_LLM_PROBABILITY_BAND` and rank feasible options |

Laya ([Convai Innovations](https://huggingface.co/convaiinnovations/laya)) is a
non-autoregressive decision engine: it answers typed questions (`choice` /
`score` / `noul`) in a single forward pass and cannot invent a number. The
backend asks it for a `condition`, a `recommended_action`, an `urgency`, and a
`needs_human_review` signal, and exposes the result at `GET /api/system1/{truckId}`.

Download its checkpoints once, before the demo (needs Docker running):

```bash
make laya-pull      # ~1.4 GB, cached in the laya_models volume
```

If the service is not running, the system is unchanged — the System-1 block is
simply absent. Base checkpoints ship over-confident, so the UI labels its
confidence **uncalibrated**.

**More ways Laya is used** (each fail-safe, each optional):

- **Model routing** — decides whether a request needs the frontier model at all
  (incidents always do; routine cases stay local). Surfaced on every explain.
- **Prompt guardrails** — screens free text before it reaches DeepSeek; an
  injection attempt is blocked and reported.
- **Output moderation** — on demand at `POST /api/ai/moderate`.
- **Operator triage** — intent, urgency and human hand-off at `POST /api/ai/triage`.
- **Root-cause typing** — Laya classifies the likely cause alongside the condition.
- **Grounding decision** — decides when an explanation should cite food-science
  sources.

### Grounding without a vector database

Explanations can cite a small, curated, openly-licensed corpus
(`data/knowledge/cold_chain.json`) retrieved by **pure-Python BM25** — no
embeddings, no vector store. Laya decides whether grounding is needed; the
retrieved passages are injected as numbered sources and returned to the client
with their licence. Inspect any query at `GET /api/ai/grounding?q=...`.

### Actions — where the AI acts, not just explains

A recommendation is advice; an **action** is the recorded, auditable fact that it
was carried out. `POST /api/actions/execute` dispatches a diversion, acknowledges
incidents, or prioritises stock for sale; `POST /api/actions/auto/{truckId}` is a
bounded auto-pilot that executes the engine's own recommendation when risk is
HIGH/CRITICAL. Every action is stored and broadcast as `ACTION_EXECUTED`, and the
Optimization screen exposes Execute / Acknowledge / Auto-pilot controls.

### Provenance

Every important value carries a source:
`MEASURED` (temperature), `CALCULATED` (exposure, deterioration, risk, food loss),
`PREDICTED` (spoilage, anomaly), `OPTIMIZED` (warehouse choice),
`AI-EXPLAINED` (explainer rationale), `SYNTHETIC` (the demo fleet).

## Tests

```bash
make test        # or: .venv/bin/python -m pytest tests/ -q
```

The suite runs on SQLite with Redis and MQTT pointed at closed ports; the offline
fallbacks are part of what is tested. The LLM is always mocked. `tests/test_demo.py`
walks the whole refrigeration-failure story end to end.

## Configuration

All backend tunables are `CC_*` environment variables (see `.env.example`):

| Variable | Default | Purpose |
|---|---|---|
| `CC_DATABASE_URL` | `postgresql+psycopg://...` | database (SQLite works for dev) |
| `CC_REDIS_URL` | `redis://localhost:6379/0` | live cache |
| `CC_INTELLIGENCE_ENABLED` | `true` | run the Person 4 worker |
| `CC_LLM_MODEL` | `deepseek/deepseek-v4.1-flash` | explainer model id |
| `CC_LLM_PROBABILITY_BAND` | `0.35` | LLM spoilage guardrail |
| `OPENROUTERAPIKEY` | – | optional; enables explainer (never commit) |

## Ownership

| Person | Owns |
|---|---|
| 1 | `frontend/` command center: dashboard, fleet, map, truck detail, incidents |
| 2 | `frontend/` intelligence: simulation, model, optimization, food-loss, inventory, comparison |
| 3 | `backend/ingest/`, `backend/routers/` (data), storage, `sensor-simulator/`, `data/` |
| 4 | `backend/intelligence/`, `backend/context.py`, `backend/opendata/`, intelligence routes |

Full ownership and boundaries: [ARCHITECTURE.md](ARCHITECTURE.md).

## Open data

Reference data is openly licensed and its provenance is served live at
`GET /api/opendata` — 17 sources across geography, routing, weather, food
science, emissions, physics and operations, each with its licence, access mode
(`offline` / `network`) and fetch status. `data/opendata/provenance.json`
records what actually arrived; `data/opendata/SOURCES.md` is the human-readable
catalogue. Literature product values are marked `verified=no` and must not be
presented as certified. The original open-data fetcher lives under
`legacy/coldchain/`; the canonical backend serves the catalogue and reference
CSVs and does not depend on the fetcher.
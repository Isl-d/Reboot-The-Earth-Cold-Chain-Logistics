# CLAUDE.md — repository guide

AI-powered cold-chain management & food-loss prevention system. Read
[ARCHITECTURE.md](ARCHITECTURE.md) first; it is the single source of truth for
the system shape. Wire shapes live in [docs/API_CONTRACT.md](docs/API_CONTRACT.md),
objects in [docs/DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md), and the full
component-by-component reference and thesis in [AI_COLD_STORAGE_LOGISTICS.md](AI_COLD_STORAGE_LOGISTICS.md).

## What runs

```
sensor-simulator/  ->  MQTT (Mosquitto)  ->  backend/  ->  PostgreSQL + Redis
                                                |              |
                                                v              v
                                    intelligence engine   REST + /ws/live
                                                \              /
                                                 frontend/ (one React app)
```

The reasoning pipeline is **Data → Condition → Prediction → Optimization →
Decision → Food Loss → UI**, each stage mapped to a file in ARCHITECTURE.md.

## Commands

| Command | Does |
|---|---|
| `make demo` | the whole stack: broker, db, redis, backend, simulator, frontend |
| `make test` | pytest suite (SQLite, no network, LLM mocked) |
| `make dev-nobroker` | full pipeline in one process, no broker/db/docker |
| `make dev-backend` / `dev-sim` / `dev-web` | individual services on the host |
| `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102` | drive the demo |
| `make reset` | every truck back to NORMAL |
| `make dev-landing` / `build-landing` | the static landing page on :5174 |

## Ownership (one owner per area)

| Person | Area |
|---|---|
| 1 | `frontend/` command center: dashboard, fleet, map, truck detail, incidents |
| 2 | `frontend/` intelligence: simulation, model, optimization, food-loss, inventory, comparison |
| 3 | `backend/ingest/`, data routers, storage, `sensor-simulator/`, `data/` |
| 4 | `backend/intelligence/`, `backend/context.py`, `backend/routers/{intelligence,model,opendata}.py` |

Shared contract files (change needs both owners): `docs/API_CONTRACT.md`,
`backend/models.py`, `frontend/src/api/types.ts`.

## Rules

- **Never compute official ML/optimization values in React.** The UI only renders
  backend results; mocks live only in `frontend/src/mocks/` and are off by default.
- **The LLM never produces numbers.** LAYLA explains code-computed facts and is
  bounded by `CC_LLM_PROBABILITY_BAND`; it may only rank *feasible* options.
- **Deterministic math owns the pipeline.** Thermal exposure, deterioration, risk,
  optimization and food loss are pure Python; do not move them behind AI.
- **Every displayed value carries a provenance tag**: MEASURED, CALCULATED,
  PREDICTED, OPTIMIZED, AI-EXPLAINED, SYNTHETIC. Never present synthetic data as
  measured, or literature values as certified thresholds.
- **One frontend.** `frontend/` is the app; `legacy/person2-frontend/` is its
  historical source. Nothing in the canonical stack imports from `legacy/`.
  `landing/` is a separate static marketing page, not a second app: no API
  calls, imports nothing from `frontend/`, and its demo figures are labelled.
- `backend/geo.py` is canonical (used by `processing.py`) — do not treat it as
  legacy.
- Work in the canonical tree; prototype tunables go in `backend/config.py` as
  `CC_*`, never as scattered constants.

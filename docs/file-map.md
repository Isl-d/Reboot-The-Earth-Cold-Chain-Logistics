# Repository file map

The canonical map of every important file, by layer. For the architecture and
ownership rules see [../ARCHITECTURE.md](../ARCHITECTURE.md); for the wire
contract see [API_CONTRACT.md](API_CONTRACT.md); for the objects see
[DOMAIN_MODEL.md](DOMAIN_MODEL.md).

> This file replaces the original `docs/file-map.md`, which described the
> retired ColdGuard repository (79 files, `COLDGUARD_*` env vars, `web/`,
> `simulator/`). That code now lives under `legacy/` and is not part of the
> running system.

## Canonical stack

| Path | Layer | Responsibility |
|---|---|---|
| `sensor-simulator/simulator.py` | Data source | publishes telemetry + typed device events every tick |
| `sensor-simulator/scenarios.py` | Data source | scenario physics (normal, excursion, door, cooling failure, delay, shock) |
| `sensor-simulator/fleet.py` | Data source | reads `data/*.csv` so simulator and DB never drift |
| `backend/ingest/consumer.py` | Data | MQTT → validate → normalize → store → incidents → WS |
| `backend/ingest/validate.py` | Data | shape/range/clock/identity checks |
| `backend/ingest/normalize.py` | Data | canonical snake_case + UTC + wire form |
| `backend/ingest/incidents.py` | Data | deterministic incident rules |
| `backend/ingest/events.py` | Data | typed device-event vocabulary + validation |
| `backend/models.py` | Data | SQLAlchemy tables (incl. `DeviceEvent`, `Prediction`) |
| `backend/db.py` · `backend/seed.py` | Data | engine, schema, reference seeding from `data/` |
| `backend/cache.py` | Data | Redis live state (in-process fallback) |
| `backend/processing.py` · `backend/geo.py` | Data | derived values and haversine |
| `backend/risk.py` | Condition | baseline risk bands |
| `backend/context.py` | Seam | the normalized Person 3 → Person 4 bundle |
| `backend/intelligence/features.py` | Condition | thermal exposure + Arrhenius deterioration |
| `backend/intelligence/anomaly.py` | Prediction | z-score + refrigeration/door/GPS/shock rules |
| `backend/intelligence/spoilage.py` | Prediction | deterministic prior, LLM-guarded |
| `backend/intelligence/risk.py` | Prediction | weighted risk + critical floors |
| `backend/intelligence/optimization.py` | Optimization | candidate warehouses, objective, constraints |
| `backend/intelligence/decision.py` | Decision | action map |
| `backend/intelligence/foodloss.py` | Food loss | without/with intervention, kg and QAR |
| `backend/intelligence/llm.py` | Explain | cold-chain explainer client (System 2) + guardrails |
| `backend/intelligence/laya.py` | System 1 | local Laya client + cold-chain question sheet |
| `backend/intelligence/engine.py` · `worker.py` | Orchestration | run the chain, persist, broadcast |
| `backend/routers/*.py` | API | REST endpoints |
| `backend/routers/opendata.py` | API | serves the licence/provenance catalogue |
| `backend/ws.py` · `backend/main.py` | API | WebSocket fan-out + app wiring |
| `frontend/` | UI | the one React app (command center + intelligence) |
| `legacy/person2-frontend/` | UI source | standalone Person 2 app, now merged into `frontend/` |
| `data/*.csv` | Reference | trucks, products, batches, warehouses, routes, inventory |
| `data/opendata/` | Reference | licence catalogue, provenance, psychrometrics, public holidays |
| `tests/` | Verification | unit + one end-to-end demo test |

## Build / run

| Path | What it is |
|---|---|
| `docker-compose.yml` | mosquitto · timescaledb · redis · backend · simulator · frontend |
| `Makefile` | `make demo`, `test`, `scenario`, `predict`, `reset`, dev targets |
| `.env.example` | every `CC_*` tunable |
| `backend/Dockerfile` · `frontend/Dockerfile` | container builds |

## Prose

| Path | Audience |
|---|---|
| `README.md` | anyone who clones the repository |
| `ARCHITECTURE.md` | architecture, layers, ownership |
| `docs/API_CONTRACT.md` | exact JSON for every seam |
| `docs/DOMAIN_MODEL.md` | objects and relationships |
| `docs/DESIGN.md` · `DESIGN.md` | visual system |
| `docs/PIPELINE.md` · `docs/PERSON_1_COMMAND_CENTER.md` · `docs/PERSON_2_FRONTEND_INTELLIGENCE.md` | person specs |
| `pitch/DECK.md` · `pitch/DEMO_SCRIPT.md` | the presentation and the four-minute run |
| `legacy/README.md` | what was retired and what replaced it |

## Where a new file goes

| If it… | Put it in |
|---|---|
| computes a number from telemetry | `backend/intelligence/` |
| moves, stores, validates or serves data | `backend/ingest/`, `backend/routers/` |
| is a new sensor or scenario | `sensor-simulator/` |
| draws one thing on screen | `frontend/src/` |
| is reference data | `data/` |
| pins behaviour the demo depends on | `tests/` |
| is retired | `legacy/` |

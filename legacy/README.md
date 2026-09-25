# legacy/ — retired ColdGuard code, kept for reference

These files belong to the **original ColdGuard** build that predates the merged
Person 3 + Person 4 platform. They are **not** imported by the running system
and are **not** collected by `make test`. They are kept here so nothing is
deleted blindly and any useful idea can be recovered.

Nothing in the canonical stack (`backend/`, `sensor-simulator/`, `frontend/`,
`data/`) may import from this folder.

| Path | Was | Superseded by |
|---|---|---|
| `backend/agent.py` | Qwen explanation + numeric guard | `backend/intelligence/llm.py` (LAYLA) |
| `backend/audit.py` | hash-chained decision log | not needed for the demo |
| `backend/detector.py` | door/defrost/sensor-fault rules | `backend/intelligence/anomaly.py` + `backend/ingest/incidents.py` |
| `backend/freshness.py` | Q10 shelf-life model | `backend/intelligence/features.py` (Arrhenius) |
| `backend/planner.py` | options A–F scoring | `backend/intelligence/optimization.py` + `decision.py` |
| `backend/state.py` | in-memory fleet state | `backend/cache.py` + `backend/processing.py` |
| `backend/ingest.py` | old MQTT ingest module (was shadowed by the `backend/ingest/` package) | `backend/ingest/` package |
| `backend/templates/track.html` | server-rendered QR page | none (dropped) |
| `simulator/sim.py` | old 12-truck simulator | `sensor-simulator/` |
| `tests/test_*.py`, `tests/traces/` | tests for the above | `tests/` (canonical suite) |
| `web/` | old MapLibre dashboard on `/api/fleet`, `/api/decisions` | `frontend/` |
| `db/schema.sql` · `backend/schema.sql` | old reference DDL (`readings`, `decisions`, `shipments`) | `backend/models.py` + `create_all` |
| `backend/seed.sql` | truncates the old ColdGuard tables | `backend/seed.py` from `data/*.csv` |
| `coldchain/` | earlier self-contained Person 3 service (own API, ingest, simulator, Alembic, open-data fetcher) | `backend/` for the pipeline; its open-data catalogue now lives in `data/opendata/` and is served by `GET /api/opendata`, and `test_opendata.py`-style coverage moved to the canonical suite |
| `person2-frontend/` | standalone Person 2 intelligence app (Vite, React 18, Tailwind 3, its own `src/`) | merged into `frontend/` (Person 1's app); kept as the original screen source |

To revive something: copy it into the canonical tree under the ownership rules
in `ARCHITECTURE.md`, update its imports to the current models/config, and add a
test. Do not import across the `legacy/` boundary.

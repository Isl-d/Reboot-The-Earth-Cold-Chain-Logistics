# AI for Cold Storage Logistics Transport

### An AI-Powered Cold-Chain Management & Food-Loss Prevention System

> One document, everything in it: the problem, the product, the architecture,
> **exactly how AI is used**, the mathematics, the data, the novelty, the impact,
> the limits, and the roadmap.
>
> Written for an **IT / engineering** audience: the emphasis throughout is on the
> system architecture, the service and interface contracts, how the AI components
> are integrated and bounded, and how the whole thing is deployed and operated.
>
> Scope note: this is a working prototype. The food-science parameters are
> calibrations, not certified thresholds, and the demo fleet is synthetic. Every
> claim below matches the code and a verified live run.

---

## Abstract

Between harvest and the consumer's plate, a large share of perishable food is
lost — 13% between harvest and retail, another 19% wasted after (FAO/UNEP 2024),
with 8–10% of global emissions attached to that loss. In hot, import-dependent
regions such as the Gulf, where summer ambient temperatures pass 45 °C, a
refrigerated truck whose cooling fails at noon can ruin a load in hours — and the
loss is usually discovered too late, at the retail gate.

This project is a **condition-aware cold-chain decision system**. It observes food
in transit with sensor and operational data, uses **deterministic physics** to
measure how much thermal damage has accrued, uses **machine learning** to predict
what happens next, uses **optimization** to choose the intervention that loses
the least food, and uses a carefully bounded **dual-process AI** to make a fast
operational call and explain it. It then proves the value of that intervention in
kilograms of food saved and money not lost.

Its central design principle is that **AI is used where AI genuinely helps, and
nowhere else**: numbers are computed deterministically, predictions come from
models, decisions come from an optimizer, and a language model — explicitly
prevented from inventing numbers — writes the explanation.

---

## 1. The problem

A cold chain fails quietly. There is no alarm at the moment a compressor stops;
there is a rejection slip at the destination, hours later, when the food is
already unsellable and the only remaining options are disposal or donation.

The industry's existing tooling is inadequate in three specific ways:

1. **It monitors, it does not decide.** Dashboards plot temperature. They do not
   tell an operator which warehouse to divert to, or whether diverting is even
   worth the transport cost.
2. **It thresholds, it does not model.** A single "safe temperature" ignores that
   7 °C is severe for chicken and tolerable for milk, and ignores how long the
   product has already been warm.
3. **It stops at the alert.** Nothing measures whether the recommended action
   actually saved food, so there is no way to know if the system is working.

The opportunity is to run the whole loop — **detect, quantify, predict,
optimize, decide, prove** — and to do it with an AI architecture that operations
teams can actually trust.

---

## 2. The solution in one page

```
Supplier / Warehouse → Refrigerated Truck → Distribution Centre → Store → Consumer
```

At every moment the system answers a fixed chain of questions:

```
What is happening?           → sensors            (MEASURED)
How serious is it?           → physics            (CALCULATED)
How much is at risk?         → exposure + age     (CALCULATED)
How much safe time remains?  → shelf-life model   (CALCULATED)
What may happen next?        → ML prediction      (PREDICTED)
What can we do?              → optimization       (OPTIMIZED)
What should we do?           → decision engine    (CALCULATED)
Why?                         → language model     (AI-EXPLAINED)
What did that save?          → food-loss engine   (CALCULATED)
```

Three properties define it:

- **Condition-aware, not threshold-aware.** Deterioration is a temperature- and
  time-dependent (Arrhenius) process, configured per product.
- **Decision-first, not dashboard-first.** The unit of output is an action, not a
  chart. The dashboard is only the face.
- **Provable impact.** The headline number is food saved (kg) and financial loss
  prevented (currency) — the business outcome, not the alert count.

---

## 3. How we use AI — the core of this project

This is the section everything else supports. The guiding rule is:

> **Deterministic code owns every number. AI owns prediction and interpretation.
> A non-generative model may make the fast call; a generative model may only
> explain it — and can never introduce a number.**

### 3.1 The AI stack at a glance

| Task | Method | Why this method | Where |
|---|---|---|---|
| Thermal exposure, deterioration, shelf life | **Deterministic physics** (no AI) | Must be exact, reproducible, auditable | `features.py` |
| Risk scoring | **Deterministic weighted blend** with floors | Safety-critical; needs explainable factors | `risk.py` |
| Anomaly detection | **ML-style statistics** (rolling z-score + rule engine) | Cheap, explainable, no training data needed | `anomaly.py` |
| Spoilage probability | **Deterministic prior + bounded AI adjustment** | Prior guarantees a floor of sanity; AI adds context | `spoilage.py` |
| Fast typed decision + confidence | **System 1: local non-generative model (Laya)** | Fast, offline, and structurally cannot hallucinate | `laya.py` |
| Natural-language explanation | **System 2: cloud generative LLM (DeepSeek V4.1 Flash)** | Language is what LLMs are genuinely best at | `llm.py` |
| Warehouse selection | **Optimization**, not an LLM | A cost objective must be solved, not narrated | `optimization.py` |
| Demand forecasting | **Lightweight statistical forecast** | Simple, explainable, sufficient for inventory advice | `forecasting.py` |

### 3.2 Layer 1 — System 1: the local, non-generative decision model (Laya)

**What it is.** Laya (Convai Innovations, Apache-2.0) is a *non-autoregressive
System-1 decision engine*. You give it a **state** and a set of **typed
questions**, and it returns **typed answers with calibrated probabilities in a
single forward pass (~33 ms on GPU, ~200–460 ms on CPU)**. Crucially, **it never
generates text.**

**Why it matters.** "Do not hallucinate numbers" is usually a prompt instruction,
which is a request, not a guarantee. Laya turns it into a **structural property**:
a model that cannot emit free text cannot emit a fabricated temperature, ETA,
cost or shelf-life figure. This is the single most important AI decision in the
project.

**What we ask it.** From the computed facts, the backend builds a JSON state and a
fixed question sheet:

| Typed question | Type | Answers |
|---|---|---|
| `condition` | choice | normal · temperature_excursion · refrigeration_failure · door_left_open · sensor_fault · traffic_delay |
| `recommended_action` | choice | CONTINUE · MONITOR · PREPARE_INTERVENTION · DIVERT · REDISTRIBUTE · PRIORITIZE_SALE |
| `urgency` | score | watch · soon · immediate |
| `needs_human_review` | noul | P(yes) |
| `route_delay_material` | noul | P(yes) |

**How it runs.** As its own service (`laya-serve`) over a Jev-compatible
`POST /v1/systemone` endpoint. The backend reaches it over HTTP. It is fully
optional and fail-safe: if it is down, the System-1 block is simply absent and
the pipeline is unchanged.

**Its role — and its honest limits.** It **corroborates and triages**; it never
overrides the deterministic decision. The base checkpoints are a *fast base to
specialise*, not a zero-shot oracle: on decision schemas unlike their training
data they are near chance, and they ship over-confident. So we label their
confidence **uncalibrated**, and we treat disagreement as information (an
`agreesWithDecision` flag) rather than a fault. Fine-tuning on cold-chain
decisions is the documented path to sharper behaviour.

### 3.3 Layer 2 — System 2: the bounded generative explainer (DeepSeek V4.1 Flash)

**What it is.** A cloud LLM (OpenRouter, `deepseek/deepseek-v4.1-flash`) that
turns the computed facts into a short, human explanation and a suggested action.

**Why a generative model here.** Explanation is precisely what LLMs are good at,
and it is the one job in the pipeline where fluent language adds value rather
than risk.

**How it is bounded.** The explainer:
- may move a spoilage estimate **only within `±CC_LLM_PROBABILITY_BAND` (0.35)**;
- may **only rank already-feasible** warehouses — the objective is recomputed and
  an infeasible pick is rejected;
- is **never the source of a number**: temperatures, ETAs, shelf life, capacity,
  costs and food-saved figures come from code;
- is called **only when it matters** — when risk escalates to HIGH/CRITICAL, at
  most once per 45 s per truck — so it never bottlenecks ingestion or rate-limits
  the provider.

If it is unavailable, a deterministic template writes the same facts in plainer
language; the system loses nothing numeric and remains fully functional offline.

### 3.4 The ML layer — anomaly, spoilage, forecasting

- **Anomaly detection** fuses a rolling **z-score** with an explicit rule engine
  (refrigeration behaviour, door pattern, GPS behaviour, handling shock). It is
  deliberately statistical rather than deep: it needs no labelled training data,
  it is explainable, and it runs on every tick.
- **Spoilage probability** starts from a **deterministic prior** — a saturating
  exposure–response curve over thermal exposure and shelf-life spent — which
  guarantees a sensible floor; only then may the explainer adjust it, within the
  band. The output carries its `source` (`heuristic` or `explainer`) and a
  `modelVersion`.
- **Demand forecasting** is a lightweight statistical forecast that feeds the
  inventory recommendation (sell-first, transfer, discount, redistribute).

### 3.5 The dual-process architecture, expressed

```
                 the situation (structured facts)
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                            │
   SYSTEM 1 (local, fast)                     SYSTEM 2 (cloud, slow)
   Laya: typed decision + confidence          DeepSeek: prose explanation
   - never generates text                     - generative, but bounded
   - cannot hallucinate a number              - never a source of numbers
   - ~ms, offline, free                       - only on escalation
        │                                            │
        └──────────────► the unified result ◄────────┘
                     (deterministic engine = the authority)
```

This is a genuine operational split, not a gimmick: the fast, safe, local model
handles the moment-to-moment judgement; the slower, expressive, cloud model
handles language — and the deterministic engine remains the authority on every
figure.

### 3.6 What is deliberately *not* AI

Thermal exposure, Arrhenius deterioration, shelf life, risk bands, feasibility,
the optimization objective, and food-loss accounting are all plain, tested
mathematics. Using an LLM for any of them would make the system unauditable and
unsafe. The design gives AI the jobs where it wins and keeps it away from the
jobs where it would hurt.

---

## 4. System architecture

```
REAL WORLD
  │
  ▼
sensor-simulator/ ──MQTT──▶ backend/ingest ──▶ PostgreSQL/TimescaleDB + Redis
 (truck physics)             (validate,        │
   reads data/*.csv          normalize,        ▼
                             incidents)   backend/intelligence
                                          features → anomaly → spoilage
                                          → risk → optimization
                                          → decision → food loss
                                          → System 1 (Laya) + System 2 (explainer)
                                               │
                                               ▼
                                       REST /api/*  +  /ws/live
                                               │
                                               ▼
                                          frontend/ (one React app)
```

Control flows the other way:
`frontend → POST /api/simulation/* → MQTT control topic → simulator`.

### 4.1 Components, inputs and outputs

| Component | Does | In | Out |
|---|---|---|---|
| **Sensor simulator** (`sensor-simulator/`) | Truck physics on real Doha routes; 7 scenarios (normal, excursion, door open, refrigeration failure, traffic delay, combined, shock) | Control messages + `data/*.csv` | MQTT telemetry + typed device events |
| **Broker (Mosquitto)** | Carries telemetry, events and control topics | — | — |
| **Ingestion** (`backend/ingest/`) | Validate → normalize → derive → store → incidents → WebSocket | Raw MQTT JSON | `sensor_readings`, Redis state, incidents, WS frames; rejects logged |
| **Storage** | System of record | Readings | `sensor_readings` (Timescale hypertable), `predictions`, `incidents`, … |
| **Cache (Redis)** | Hot current state | Latest reading/derived/risk | `truck:{id}:*`, `prediction:{id}`, sets; in-process fallback |
| **Seam** (`context.py`) | The one data→intelligence contract | Truck + batch + history | Normalized context bundle |
| **Condition engine** (`features.py`) | Deterministic physics | Telemetry window + batch | Exposure, deterioration, shelf life, humidity/door/shock exposure |
| **Anomaly** (`anomaly.py`) | z-score + rules | Features + telemetry | `{anomaly, type, score}` |
| **Spoilage** (`spoilage.py`) | Prior + bounded AI adjustment | Features | `spoilageProbability`, `confidence`, `source`, `rationale` |
| **Risk** (`risk.py`) | Weighted blend + floors | Features, spoilage, anomaly, delay | `riskScore`, `riskLevel`, factors |
| **Optimization** (`optimization.py`) | Solve `min(transport+foodloss+delay)` under constraints | Context, features, spoilage | Candidate warehouses, selected, objective |
| **Decision** (`decision.py`) | Deterministic action map | Risk + feasibility | `CONTINUE / MONITOR / PREPARE_INTERVENTION / DIVERT` |
| **Food loss** (`foodloss.py`) | Value of acting vs not acting | Batch, features, spoilage, optimization | kg saved, money prevented |
| **System 1** (`laya.py`) | Local typed decision | State + question sheet | `system1` block |
| **System 2** (`llm.py`) | Bounded prose | Facts | Explanation |
| **Orchestrator** (`engine.py` + `worker.py`) | Run the chain off the hot path; persist; broadcast | Context | Unified result + WebSocket events |
| **API + WebSocket** (`routers/`, `ws.py`) | REST and live stream | — | JSON, `/ws/live` |
| **Frontend** (`frontend/`) | Command center + intelligence screens | REST/WS | UI; never computes official values |
| **Open data** (`opendata.py`) | Licence catalogue | `data/opendata/` | `/api/opendata` |

### 4.2 The pipeline stages

**Data → Condition → Prediction → Optimization → Decision → Food Loss → UI.**
Each stage maps to an exact file; the intelligence stages run in a throttled
background worker so ingestion never waits on a model.

### 4.3 IT architecture — services, stores, interfaces

The system is a small, well-bounded **distributed application**: a set of
single-purpose services that communicate over explicit, documented interfaces.

**Service topology (seven containers, one command):**

| Service | Role | Technology |
|---|---|---|
| `mosquitto` | MQTT broker (edge transport) | Eclipse Mosquitto 2 |
| `timescaledb` | System of record | PostgreSQL 16 + TimescaleDB |
| `redis` | Hot current state (with in-process fallback) | Redis 7 |
| `laya` | Local System-1 decision model | `laya-serve` (HTTP) |
| `backend` | Ingestion, intelligence, REST, WebSocket | Python / FastAPI |
| `simulator` | Synthetic truck fleet | Python |
| `frontend` | Command center + intelligence UI | React 19 / TypeScript / Tailwind |

**Data stores:**
- **PostgreSQL/TimescaleDB** is the authoritative record. `sensor_readings` is a
  **hypertable** when the extension is present, a plain indexed table otherwise —
  behaviour is identical either way.
- **Redis** holds only hot, rebuildable state (latest reading, derived values,
  active incidents, latest predictions). If it is unavailable, the same cache
  runs **in-process**, so the system never depends on it.

**The intelligence engine is a module, not a microservice.** Ingestion, the
reasoning chain and the API live in one FastAPI process, cleanly separated by
folder (`ingest/`, `intelligence/`, `routers/`). This keeps the operational
surface tiny while preserving strict internal boundaries.

### 4.4 Interfaces and contracts (the integration story)

Every boundary is a typed, documented contract — which is what makes a
multi-developer build stay coherent.

| Interface | Direction | Transport | Contract |
|---|---|---|---|
| Telemetry | sensor → backend | MQTT `coldchain/trucks/{id}/telemetry` | JSON sensor schema |
| Device events | sensor → backend | MQTT `.../events` | closed event vocabulary |
| Simulation control | backend → simulator | MQTT `coldchain/control/{id}` | `{scenario, speedMultiplier, paused, reset}` |
| Data → intelligence | in-process + `GET /api/internal/context/{truckId}` | function / REST | the normalized context bundle |
| Intelligence → data | `POST /api/internal/predictions` | REST | prediction payload |
| System 1 | backend → Laya | HTTP `POST /v1/systemone` | `{state, questions}` → typed answers |
| System 2 | backend → explainer | HTTPS (OpenRouter) | bounded JSON |
| Backend → UI | `GET /api/*` + `/ws/live` | REST + WebSocket | documented DTOs |
| Open data | `GET /api/opendata` | REST | licence catalogue |

The full JSON for each seam is the single source of truth in the API contract,
and one shared context bundle guarantees the data layer and the intelligence
layer can never disagree.

---

## 5. Mathematics (the deterministic core)

| Quantity | Formula |
|---|---|
| Thermal exposure | `E_T = Σ max(0, T_i − T_safe) · Δt_i`  (°C·min) |
| Deterioration rate | `k(T) = k_ref · exp(Ea/R · (1/T_ideal − 1/T))` |
| Deterioration | `D = Σ k(T_i) · Δt_i` |
| Remaining shelf life | `remaining = shelf_life · (1 − D)` |
| Humidity exposure | `Σ max(0, H_i − H_limit) · Δt_i` |
| Spoilage prior | `0.4·(1 − e^{−3D}) + 0.6·(1 − e^{−E_T / E50})`, `E50 = 15 °C·min` |
| Risk | weighted sum of six factors, with critical floors |
| Optimization | `min(C_transport + C_foodloss + C_delay)` s.t. ETA ≤ safe time, capacity, temperature |
| Food loss without | `clamp(D + spoilageProbability)` |
| Food loss with | `min(lossWithout, selected.expectedLossPercent / 100)` |
| Food saved | `(lossWithout − lossWith) · quantityKg` |

Risk weights: spoilage 0.30, thermal exposure 0.20, remaining shelf life 0.20,
anomaly 0.15, route delay 0.10, humidity 0.05 — with floors so no single strong
signal can be hidden.

All parameters live in configuration (`CC_*` environment variables and
`data/products.csv`), never as scattered constants.

---

## 6. Data

**Reference data** (`data/*.csv`): 4 trucks; chicken/milk/lettuce with safe range,
ideal temperature, shelf life, value/kg, activation energy and humidity limit;
7 product batches; 3 warehouses (WH01–WH03); 3 stores; 4 routes + GeoJSON;
inventory.

**Telemetry** — synthetic, generated by the simulator from those CSVs. Schema:

```json
{"deviceId":"TRUCK-T102","truckId":"T102","timestamp":"…",
 "temperatureC":7.2,"humidityPct":74,"latitude":25.2854,"longitude":51.531,
 "speedKmh":42,"gForce":0.2,"doorOpen":false,"refrigerationOn":true}
```

**Device events** — a closed vocabulary (`DOOR_OPENED/CLOSED`,
`REFRIGERATION_ON/OFF`, `SHOCK`, `POWER_LOST/RESTORED`, `SENSOR_FAULT`,
`SCENARIO_CHANGED`). An event says *what happened*, never *for how long*.

**Open data** (`data/opendata/`): 17 openly-licensed sources across geography,
routing, weather, food science, emissions, physics and operations, served live at
`GET /api/opendata` so the licence position is checkable. Literature product
values are explicitly marked `verified=no`.

**Provenance taxonomy** — every displayed value is labelled by origin:

| Tag | Meaning | Example |
|---|---|---|
| `MEASURED` | from a sensor | temperature |
| `CALCULATED` | deterministic arithmetic | exposure, deterioration, risk, food loss |
| `PREDICTED` | model estimate | spoilage, anomaly, System 1 |
| `OPTIMIZED` | chosen by the optimizer | warehouse |
| `AI-EXPLAINED` | prose over facts | explainer rationale |
| `SYNTHETIC` | simulated demo data | the fleet |

---

## 7. What is novel

1. **Trust by construction, not by prompt.** The AI that makes the fast decision
   (Laya) is *non-generative*, so it structurally cannot fabricate a number; the
   AI that writes prose is bounded and never a source of figures. This inverts
   the usual "ask the LLM not to hallucinate" approach.
2. **A true dual-process operational AI.** A local, fast, safe System 1 paired
   with a cloud, slow, expressive System 2, with deterministic code as the
   authority — a pattern borrowed from how humans reason, applied to logistics.
3. **Food loss as the closing metric.** The system computes expected loss without
   intervention, expected loss with it, and the difference in kg and money —
   closing the business loop most demos never reach.
4. **Condition-aware physics.** Per-product Arrhenius deterioration instead of a
   single threshold.
5. **One seam, no drift.** A single normalized context bundle between data and
   intelligence keeps a multi-person team, a simulator, a database and a UI
   telling one story.
6. **Honest data.** Rejects are stored, provenance is live, synthetic is labelled
   synthetic, and base-model confidence is labelled uncalibrated.

---

## 8. Engineering, IT architecture and feasibility

### 8.1 Technology stack (and why)

- **Backend:** Python + FastAPI — async, typed, and gives OpenAPI documentation
  for free.
- **Data:** PostgreSQL 16 with optional **TimescaleDB**; **Redis** for hot state.
- **Messaging:** Mosquitto **MQTT** for the edge — lightweight and IoT-native.
- **AI:** a local `laya-serve` (System 1) plus a cloud **OpenRouter** client
  (System 2).
- **Frontend:** React 19 + TypeScript + Tailwind, with Leaflet and Recharts for
  the map and charts.
- **Packaging:** Docker Compose — one command to run the whole stack.
- **Deliberately not used:** Kubernetes, Kafka, microservice sprawl and object
  storage. None is needed at this scale, and each would add failure modes and
  operational cost without improving the outcome.

### 8.2 Deployment and operations

- `make demo` starts all seven services; `make status` shows what is running and
  whether the API is healthy; `make stop` stops and keeps data; `make nuke` wipes
  containers, volumes, images and build cache.
- Model weights are cached in a named Docker volume; the Laya image is built once.
- `GET /healthz` reports database, Redis, MQTT and fleet size in one call.

### 8.3 Reliability and resilience

- **Offline-first:** the system runs end to end with no internet; the only
  optional network call is the explainer, which degrades to a template.
- **Degrade, never crash.** Redis → in-process cache; TimescaleDB → plain
  indexed table; System 1 down → block absent; explainer down → template. Each
  dependency has a defined fallback.
- **Bad data is surfaced, not dropped:** rejected readings are written to
  `ingest_rejects` with a reason, so data quality is visible.
- The intelligence worker runs **off the ingest hot path**, so a slow model never
  stalls telemetry.

### 8.4 Quality and observability

- **98 automated tests**, no network required (SQLite, closed ports, mocked
  models), plus one **end-to-end test** that replays the whole
  refrigeration-failure story.
- Structured logging across ingestion, the intelligence chain, and the Laya/LLM
  clients.
- **Provenance on every value** is a human observability feature: you can see at
  a glance whether a number was measured, calculated, predicted, optimized,
  AI-explained or synthetic.

### 8.5 Security, privacy and responsible AI

- No secrets in the repository; the API key lives in a git-ignored `.env`.
- No personal or sensitive data is processed; the models see only structured
  operational facts.
- The generative model is bounded (banded spoilage adjustment, feasible-only
  ranking) and is never a source of numbers.
- CORS is configurable; services are bound to the host for local operation.

### 8.6 Scalability and extensibility

- The time-series store is a **hypertable**, so volume growth is a storage
  problem, not a redesign.
- Adding a truck or a sensor is a **data** operation (a device row plus a topic),
  not a code change.
- The condition engine is **product-configured**, so new products — and later new
  domains such as pharmaceuticals and vaccines — reuse the same pipeline.

---

## 9. Impact

For a single 500 kg load of chicken that loses refrigeration in transit, the
verified run shows the order of magnitude this is about:

- Without intervention: a substantial share of the load at risk.
- With the recommended diversion: loss capped at the short transit cost.
- **Result: tens to a hundred+ kilograms of food saved and thousands of QAR not
  lost**, plus the associated CO₂ not emitted.

Scaled to a fleet, the same loop turns every refrigeration event from a late
rejection into an early, quantified, and provably worthwhile intervention.

---

## 10. Demonstration scenario

Truck **T102** carries 500 kg of fresh chicken (safe 0–4 °C).

1. It runs normally at ~3.5 °C, risk LOW.
2. Refrigeration fails; the cargo warms.
3. The system detects the deviation, opens an incident, and quantifies thermal
   exposure and deterioration.
4. Spoilage probability and risk rise; remaining safe time falls.
5. The optimizer evaluates WH01/WH02/WH03 (ETA, capacity, temperature).
6. The decision engine recommends **DIVERT**; Laya corroborates with a typed
   condition; the explainer writes the "why".
7. The food-loss panel shows the kg and currency saved.

The whole story is reproducible headless with `make test` (test_demo), and live
with `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102`.

---

## 11. Limitations and responsible AI

- Food-science parameters are **prototype calibrations, not certified**.
- The demo fleet and its telemetry are **synthetic**; nothing synthetic is
  presented as measured.
- **Laya's base checkpoints are near-chance zero-shot on unseen schemas** and
  over-confident; hence corroborate-only and *uncalibrated* labelling.
- The explainer is optional and bounded; it can never move a number outside the
  band or select an infeasible warehouse.
- No personal or sensitive data is processed; the model never sees anything but
  structured operational facts.

---

## 12. Roadmap

- **Near term:** fine-tune and calibrate Laya on cold-chain decisions; widen the
  demo fleet; add on-demand "why" in the UI.
- **Medium term:** connect real telemetry (an ESP microcontroller build is
  included); predictive maintenance of cooling units; store-side prioritised
  sale lists.
- **Long term:** generalise the condition engine beyond food — the same
  `product + environment + time + location + handling → integrity` abstraction
  extends to **pharmaceuticals, vaccines, blood and biological samples** — and
  build a regional food-loss and cold-chain gap map.

---

## 13. One-line summary

> **AI for cold storage logistics transport:** the sensors tell us what is
> happening, deterministic physics tells us how much damage has occurred, ML
> predicts what happens next, optimization chooses the action, a local
> non-generative model corroborates it, a bounded generative model explains it,
> and a food-loss engine proves it saved real food — with every number labelled
> by how it was produced.

---

## Appendix — API and runtime

**Run:** `make demo` (everything) · `make status` · `make stop` · `make nuke`.

**Key endpoints:** `GET /api/trucks`, `/api/trucks/{id}`,
`/api/predictions/{batchId}`, `/api/model/{truckId}/thermal-exposure|deterioration|spoilage`,
`GET /api/system1/{truckId}`, `POST /api/optimization/evaluate`,
`GET /api/analytics/food-loss`, `/api/analytics/scenario-comparison/{scenario}`,
`POST /api/ai/explain`, `GET /api/opendata`.

**WebSocket** `/ws/live`: `HELLO`, `TRUCK_STATE_UPDATED`, `INCIDENT_*`,
`PREDICTION_UPDATED`, `RECOMMENDATION_UPDATED`, `FOOD_LOSS_UPDATED`,
`DEVICE_EVENT`.

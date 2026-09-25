# Build Plan — Cold-Chain Intelligence (Person 2 frontend)

> **Historical.** This was Person 2's standalone build plan. Those screens now
> live in the merged app under `frontend/src/screens/` (see
> [ARCHITECTURE.md](ARCHITECTURE.md)). Paths below refer to the retired
> `legacy/person2-frontend/`. Kept as a record of the work and its decisions.

AI-Powered Cold Chain Management & Food Loss Optimization System — intelligence / analytics frontend.

**Sources of truth (read before any segment):**
- [docs/PERSON_2_FRONTEND_INTELLIGENCE.md](docs/PERSON_2_FRONTEND_INTELLIGENCE.md) — our scope, screens, APIs, data shapes, definition of done
- [docs/DESIGN.md](docs/DESIGN.md) — colors, typography, spacing, radii, elevation, components
- [docs/PIPELINE.md](docs/PIPELINE.md) — full system pipeline and module ownership
- [docs/PERSON_1_COMMAND_CENTER.md](docs/PERSON_1_COMMAND_CENTER.md) — **Person 1's scope. Do NOT build anything in it.** Used only to avoid overlap and to share data types.
- [example/](example/) — 5 reference screenshots

**Ground rules**
- Build what the Person 2 spec lists, plus only the extras approved in "Decisions" below. Nothing else.
- Never build Person 1 features: command-center dashboard, live map, truck markers, truck detail page, incident panel, "View reasoning", GPS trajectory, humidity/speed/door displays.
- Stack: React, TypeScript, Tailwind CSS, Recharts, Axios, React Query (+ Vite, React Router). **No Leaflet** — maps belong to Person 1.
- The frontend is a visualization layer. Never compute official spoilage probability, shelf life, thermal exposure, CO₂, or routing in React. Never modify sensor data or invent constants.
- Every visual decision follows DESIGN.md (prose sections win over the YAML front-matter).
- Build screens to be merge-ready: each screen is a self-contained route component; the shell is throwaway.
- Finish and verify one segment before starting the next. Tick its box when verified.

---

## Decisions (confirmed with user, 2026-09-25)

| Topic | Decision |
|---|---|
| Relationship to Person 1 | One final app. Person 2 builds screens separately in this folder with a minimal shell; merged into Person 1's app later. |
| Shared types | Reuse Person 1's `Truck`, `Prediction`, `Recommendation` interfaces verbatim in `src/api/shared-types.ts`; Person 2 types sit beside them. |
| App name (working) | **Cold-Chain Intelligence** (shell only; final name comes from Person 1's app) |
| Colors | DESIGN.md prose: navy `#0F172A`, slate neutrals, sky `#0EA5E9`. Ignore YAML `primary: #000000`. |
| Currency | QAR, JetBrains Mono, e.g. `QAR 9,800.00` |
| Device priority | Laptop/projector first. Tablet and mobile layouts work per DESIGN.md, less polish. |
| Data before backend | Rich mock data in `src/mocks/`, switched by `VITE_USE_MOCKS`. The mock layer plays the backend; screens never know. |
| Missing API shapes | I draft [docs/api-contracts.md](docs/api-contracts.md); user sends it to the backend owner to confirm. |
| Backend flexibility | Endpoints in one file; adapters map backend DTOs → frontend models. Backend changes = edit adapter only, never screens. |
| Maps | **None.** Person 1 owns all maps. |
| Simulation layout | Samsara split (example 5): controls left, big sensor chart right, timeline bar below. |
| KPI cards | Big mono number + provenance badge + mini trend line inside. |
| Breakdown charts | Horizontal sorted bars (not pies). |
| Scenario Comparison | Split WITHOUT (red) vs WITH OPTIMIZATION (green), animated loss bars, food saved kg + QAR saved center, scenario picker. |
| CO₂ | "CO₂ avoided" KPI + trend on Food-Loss Analytics. Value from backend. |
| Actions | Style the 5 spec actions; any other backend action (QUARANTINE, ADJUST_STORAGE, REROUTE…) gets a generic style. |
| Pipeline view | Compact pipeline strip on the Model screen: Sensors → AI Engine → Decision → Action → Food Loss; stages light up as simulation runs. |
| Optimization trip visual | Start → destination stepper with ETA (no map). |

### Approved extras (not in the Person 2 spec)
1. Live badge + Today / Day / Week time-range control in the top bar.
2. Shaded excursion bands + crosshair tooltip on sensor/exposure charts.
3. Filter side panel + filter chips on Inventory and Analytics.
4. Mini trend lines inside KPI cards.
5. CO₂ avoided KPI + trend.
6. Pipeline strip on the Model screen.
7. Generic style for non-spec actions.
8. Mock backend + api-contracts.md.
9. Simulation timeline/progress bar.
10. Inventory row extras: days left, demand-vs-stock mini bar, "Evaluate options" → opens Optimization.
11. Detail table under Analytics charts.
12. Scenario picker + animated bars on Scenario Comparison.
13. Start → destination stepper on Optimization.
14. `/styleguide` dev route.

### Removed (overlaps Person 1)
Leaflet map on Optimization · humidity/door/shock/GPS sensor list on Simulation · live risk strip on Simulation · breach banner · sidebar links to Person 1 pages.

### Borrowed from examples
| Example | What we take | Where |
|---|---|---|
| 1 Control Tower | Breakdown + legend (as bars); detail table under visuals | Analytics |
| 2 Sensor rows | Clean chart rows, big current value, top bar with tabs + range + LIVE | Simulation, top bar |
| 3 TrioMobil | KPI cards with mini trend; shaded area chart with tooltip; range control; origin → destination stepper | KPIs, Model, Optimization |
| 4 Emerson | Collapsible filter panel + filter chips | Inventory, Analytics |
| 5 Samsara | Split layout, big chart with shaded excursion bands + crosshair, timeline below | Simulation |

Not taken: any map, clustered markers, pie charts, °F (we use °C).

---

## Progress

- [x] Segment 0 — Project scaffold
- [x] Segment 1 — Design system foundation
- [x] Segment 2 — Data layer, API contracts, mock backend
- [x] Segment 3 — Minimal shell
- [x] Segment 4 — Simulation screen
- [x] Segment 5 — Mathematical Model screen
- [x] Segment 6 — Optimization screen
- [x] Segment 7 — Food-Loss Analytics screen
- [x] Segment 8 — Inventory screen
- [ ] Segment 9 — Scenario Comparison screen
- [ ] Segment 10 — Definition-of-done verification

---

## Segment 0 — Project scaffold
- Vite + React + TypeScript; add Tailwind, Recharts, Axios, React Query, React Router.
- Folders: `src/design/` (tokens + primitives), `src/api/` (client, types, hooks), `src/mocks/` (mock backend), `src/layout/` (throwaway shell), `src/screens/<screen>/`.
- Routes: `/simulation`, `/model`, `/optimization`, `/analytics`, `/inventory`, `/comparison`, plus `/styleguide` (dev only).
- `.env`: `VITE_API_BASE_URL`, `VITE_WS_URL`, `VITE_USE_MOCKS=true`.
- **Verify:** builds and runs; all routes open.

## Segment 1 — Design system foundation (DESIGN.md only)
- **Tailwind tokens:** navy/sky/neutral palette; 4 status tiers (Safe, Warning, Critical, Offline) each with base/tint/border/foreground; 5 provenance colors; typography scale (headline-xl…sm, body-lg…sm, telemetry-num-xl/md, label-code, label-ui); radii; spacing; 4 elevation levels; focus halo `0 0 0 2px #FFFFFF, 0 0 0 4px #0EA5E9`.
- **Fonts:** Inter for UI; JetBrains Mono with tabular numerals for every number, ID, duration, QAR value.
- **Primitives:**
  - `Button` — primary (`#0F172A` → hover `#1E293B` → active `#0A192F`), secondary (`#E0F2FE` / `#0284C7` / `#BAE6FD`), destructive (`#EF4444`); 4px radius.
  - `ProvenanceBadge` — Measured / Calculated / Predicted / Recommended / Finance-Validated; pill, leading dot, `label-code` uppercase.
  - `StatusChip` — pill, 4 tiers.
  - `ActionChip` — 5 spec actions + generic fallback.
  - `Card` — white, 1px `#E2E8F0`, 8px radius, flat at rest; Level 1 shadow + `#CBD5E1` border on hover.
  - `KpiCard` — label, provenance badge, `telemetry-num-xl` value, mini trend line.
  - `DataTable` — `#F8FAFC` header, `label-ui` uppercase, row padding `0.5rem 0.75rem`, 3px status left border, metrics right-aligned mono.
  - `Input` / `Select` — `#CBD5E1` border, `#0EA5E9` focus, fixed trailing unit (°C, min, QAR, kg).
  - `SegmentedControl` — Today / Day / Week.
  - `LiveBadge` — pulsing dot, `label-code`.
  - `FilterPanel` + `FilterChip` — collapsible groups, removable chips.
  - `Stepper` — origin → destination with ETA.
  - `Modal` — `rgba(15,23,42,0.65)` scrim, 12px radius, Level 3 shadow.
- **Chart kit (Recharts):** shared axis/grid/tooltip styling, crosshair tooltip, `ReferenceLine` for safe limit, `ReferenceArea` shaded excursion bands, horizontal bar preset. Load `dataviz` skill first; DESIGN.md colors override its palette.
- **Verify:** `/styleguide` renders every primitive and chart preset in every variant; values match DESIGN.md.

## Segment 2 — Data layer, API contracts, mock backend
- `src/api/shared-types.ts`: Person 1's `Truck`, `Prediction`, `Recommendation` copied verbatim.
- `src/api/types.ts`: types copied exactly from the Person 2 spec's example JSON (thermal exposure, deterioration, spoilage, optimization candidates/result, food-loss analytics, inventory batch, simulation start, optimization evaluate).
- Write [docs/api-contracts.md](docs/api-contracts.md) proposing shapes the spec leaves out: `/ws/live` messages, `/api/trucks/{id}/telemetry` time-series, analytics series (loss over time, by cause, by product, by warehouse, predicted vs actual, CO₂), scenario-comparison counterfactuals, simulation stop/reset. Reuse Person 1 field names where they overlap. Mark each "PROPOSED — confirm with backend".
- **Backend-flexibility layer (screens never touch raw backend JSON):**
  - `src/api/endpoints.ts` — every URL/path in one file.
  - `src/api/dto.ts` — raw backend response shapes (what the wire sends).
  - `src/api/adapters/` — one mapper per resource: backend DTO → frontend model type. When the backend changes names, nesting, or units, only the DTO + adapter change; screens and components stay untouched.
  - Lightweight runtime guards in each adapter (no extra library): missing/invalid fields → clear error state on screen, never a crash.
  - The mock backend emits DTO-shaped data and goes through the same adapters, so the real-backend path is exercised from day one.
- Axios instance; React Query hooks for `/api/simulation/*`, `/api/analytics/*`, `/api/inventory`, `/api/optimization/*`, `/api/trucks/{id}/telemetry`; `/ws/live` hook with reconnect.
- **Mock backend (`src/mocks/`):** Axios adapter + fake WebSocket emitter. Scenario-driven generators so each of the 6 scenarios produces a distinct believable curve. Several trucks, batches, warehouses in Qatar. Respects `speedMultiplier`.
- Loading / error / empty / offline states (offline uses the Offline slate tier).
- **Verify:** types compile; with mocks on, every hook returns data; with mocks off, hooks call the real URLs.

## Segment 3 — Minimal shell (throwaway)
- Left nav: 64px icon rail ↔ 260px drawer, 6 screen links, working name.
- Top bar: screen title, LiveBadge, Today/Day/Week control.
- Responsive grid: 12 col ≥1280 · 8 col 768–1279 · 4 col <768.
- Kept thin so screens drop into Person 1's app without changes.
- **Verify:** nav works at all three breakpoints; focus halo visible on keyboard nav.

## Segment 4 — Simulation screen (Samsara split)
- **Left panel:** truck, product/batch, scenario (NORMAL, TEMPERATURE_EXCURSION, DOOR_LEFT_OPEN, REFRIGERATION_FAILURE, TRAFFIC_DELAY, COMBINED_FAILURE), speed, Start / Stop / Reset.
- **Right:** large sensor graph(s) of the telemetry the backend returns for the simulated truck, with safe-limit line, shaded excursion bands, crosshair tooltip, **Measured** badge.
- **Below:** simulation timeline/progress bar with elapsed sim time and state (running / stopped).
- Start → `POST /api/simulation/start` `{ truckId, scenario, speedMultiplier }`; Stop/Reset via `/api/simulation/*`.
- **Verify:** DoD 1–3.

## Segment 5 — Mathematical Model screen
- **Pipeline strip** at top: Sensors → AI Engine → Decision → Action → Food Loss; active stage highlighted as simulation progresses.
- **Chain cards:** Sensor data → thermal exposure → deterioration → remaining shelf life → spoilage probability → risk; each shows the backend value + provenance badge.
- **Thermal exposure:** temperature area chart with safe line and shaded area above it + accumulated exposure (`C*min`), as returned by backend.
- **Deterioration:** `deteriorationFraction`, `remainingShelfLifeHours`, `confidence` — **Calculated**.
- **Spoilage:** `spoilageProbability`, `confidence`, `modelVersion` — **Predicted**, labelled *"Prediction — not a confirmed food-safety determination."*
- Formulas shown as text only, using backend-supplied intermediate values.
- **Verify:** DoD 4–6.

## Segment 6 — Optimization screen
- **Candidates table:** warehouse, ETA, capacity, temp compatibility, expected loss %, transport cost (QAR), feasibility; selected row highlighted + **Recommended** badge.
- **Stepper:** truck → selected warehouse with ETA.
- **Objective panel:** `min transport cost + food-loss cost + delay cost`; constraints checklist (ETA ≤ remaining safe time, quantity ≤ capacity, storage temp compatible, route feasible), each ticked from backend values; `objectiveValue`.
- "Why feasible" explanation built only from returned values.
- Copy credits the backend optimizer ("Selected by optimization engine"), never the UI.
- **Verify:** DoD 7–8.

## Segment 7 — Food-Loss Analytics screen
- **KPI cards (with mini trends):** transported, at risk, lost, saved (kg); loss rate %, prevented loss %; financial loss and loss prevented (QAR, **Finance-Validated**); CO₂ avoided.
- **Charts:** food loss over time; loss by cause, by product, by warehouse (horizontal bars); predicted vs actual loss; saved food; financial impact.
- Filter side panel + chips (period, product, warehouse, cause).
- Detail table under the charts.
- **Verify:** DoD 10.

## Segment 8 — Inventory screen
- Filter side panel + chips (location, product, recommendation, risk tier).
- Table from `GET /api/inventory`: batch, product, location, quantity, expiry + days left, predicted demand, expected excess, demand-vs-stock mini bar, spoilage risk, recommendation (`ActionChip`, **Recommended**).
- Row status border by risk tier.
- Row action "Evaluate options" → `POST /api/optimization/evaluate` `{ truckId, batchId }` → opens Optimization with the result.
- **Verify:** all fields visible; evaluate sends the correct body.

## Segment 9 — Scenario Comparison screen
- Two large panels: WITHOUT INTERVENTION (Critical red tier) vs WITH OPTIMIZATION (Safe green tier), expected loss % as animated bars.
- Center: food saved (kg) and QAR saved in `telemetry-num-xl`.
- Scenario picker to switch counterfactuals. Backend values only.
- **Verify:** DoD 9.

## Segment 10 — Definition-of-done verification
- Walk all 10 DoD steps end-to-end in the browser with mocks on.
- Audit every screen against DESIGN.md: colors, mono numerics right-aligned, provenance badges, radii, breakpoints.
- Overlap audit: confirm nothing from PERSON_1_COMMAND_CENTER.md was built.
- Confirm no official calculation happens in React.
- Run `code-review`, `simplify`, `security-review`.

---

## Skills to use

All installed globally; invoke by name with the Skill tool.

| When | Skill | Purpose |
|---|---|---|
| Run & see the app | `run` | Launch the dev server and confirm a change works |
| Open the browser | `anthropic-skills:built-in-browser` | Browser pane in the desktop app — screenshots, visual checks |
| Open the browser | `anthropic-skills:chrome-browser` | Drive the user's real Chrome (Claude in Chrome extension) |
| Desktop control | `anthropic-skills:computer-use` | Fallback when browser tools aren't available |
| Find bugs | `code-review` | Correctness review at the end of each segment |
| Clean up code | `simplify` | Reuse / simplification pass after each segment |
| Security | `security-review` | Final pass (Segment 10) |
| Charts | `dataviz` | Read before any chart, KPI tile, or sparkline. DESIGN.md colors override its palette |
| Data sanity | `data:validate-data` | Check analytics displays match source numbers (Segment 7) |

**Per-segment loop:** build → `run` + browser screenshot compared to DESIGN.md and the examples → `code-review` → `simplify` → tick the box.

**Do NOT use:** `routeyai-ui`, `routeyai-mapbox`, `routeyai-supabase`, `routeyai-fastapi` — different project, conflicting design system and stack.

---

## Resolved (2026-09-25)
- **WebSocket:** `/ws/live` (Person 2 spec) and `/sensors/live` (Person 1) are the same stream. One socket, URL from `VITE_WS_URL` only — never hardcode the path.
- **Design alignment:** Person 1 also uses DESIGN.md, so tokens/primitives must stay pure DESIGN.md for a clean merge.

## Open items
1. **Warehouse module** — most probably Person 1 (user not certain). Do not build; revisit if the user says otherwise.
2. **api-contracts.md** — after Segment 2, user sends it to the backend owner.

# Thermal Trace — twelve slides

The words for the pitch. The built deck is **[docs/deck/index.html](../docs/deck/index.html)**
(open it in a browser: ← → to move, F fullscreen, N speaker notes, O overview,
P print to PDF; a PDF export sits next to it). The landing page
(`landing/src/content/copy.ts`) mirrors this file, so edit here first. Brand rules:
[docs/brand/README.md](../docs/brand/README.md).

Non-technical. One number per slide where possible, each with its source or a
SIMULATED / ILLUSTRATIVE tag. About five minutes, plus the live demo.

**1. Thermal Trace.**
*Know what a failing fridge is costing before the gate does.* A condition-aware
cold-chain decision system: it watches food in transit, measures how much safe
life a failure has cost, and chooses the action that loses the least of it.

**2. The problem.**
13 % of food is lost between harvest and retail; another 19 % is wasted after.
Food loss and waste cause 8–10 % of global emissions. *(FAO/UNEP 2024.)*

**3. Why here.**
Qatar imports most of its fresh food across a summer that passes 45 °C. A truck
fridge that fails at noon can spoil a load in hours. The National Food Security
Strategy 2030 targets −50 % food waste and −30 % food loss.

**4. What actually goes wrong.**
Nobody finds out until the load is rejected at the gate. By then the food is
gone, and so is any chance to send it somewhere it could still be sold.
*(Timeline on the slide is illustrative.)*

**5. The product in one line.**
Sensors tell us what is happening; mathematics tells us how much damage has
occurred; AI predicts what happens next; optimization chooses the action; the
decision engine turns it into an operation; and the food-loss engine proves what
it saved.

**6. Detect at the moment of failure.**
A live map of every truck, with an incident the instant a temperature leaves the
safe band and stays there. Not a dashboard of charts — a decision surface.
*(Screenshot: demo build, simulated fleet.)*

**7. Physics before AI.**
Thermal exposure is the sum of the degrees above the limit over time.
Deterioration is an Arrhenius rate relative to the product's ideal temperature.
Remaining shelf life follows from it. Every one of those numbers is
deterministic Python — no model touches them.

**8. AI where it earns its place.**
Two AI layers, neither allowed to invent a number. **Laya** (System 1) is a
local, offline, Apache-2.0 decision model: it answers typed questions —
condition, action, urgency, needs human review — and never generates text; it
corroborates the deterministic decision and never overrides it. An
**OpenRouter** language model (System 2) is the explainer: it turns the
calculated facts into plain language, may only rank feasible options, and may
move the spoilage estimate only within a fixed band. Around them, plain
deterministic code (not AI): spoilage probability, anomaly detection and demand
forecasting.

**9. Optimization, not vibes.**
`min(transport + food-loss + delay)` subject to ETA ≤ remaining safe time,
warehouse capacity and temperature compatibility. Three cold stores in range
(WH01 18 min, WH02 27 min, WH03 46 min — scripted demo ETAs); the optimizer
picks WH01 and the decision is DIVERT. The model only explains the choice.

**Live demo** — T102, 500 kg of fresh chicken, refrigeration failure.
Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md); come back to slide 10.

**10. The number that matters.**
Food saved (kg) and financial loss prevented (QAR): expected loss without the
intervention minus expected loss with it, times the quantity. That is the whole
point. *(Bars on the slide are illustrative; the real figure is the one the demo
just computed.)*

**11. Every value knows where it came from.**
MEASURED, CALCULATED, PREDICTED, OPTIMIZED, AI-EXPLAINED, SYNTHETIC — shown on
screen. Synthetic demo data is never dressed up as a real measurement, and
literature values are marked as unverified.

**12. The ask.**
One cold-chain operator, one month, twenty pallets. On day one we can tell you
how much of your loss is refrigeration and how much is scheduling.
Signed off by **Team 2 · Reboot the Earth · CMUQ**, five members (names are
placeholders on the slide until filled in).

---

### Backup slides

- **B1 · Architecture.** Simulator → MQTT → FastAPI ingestion → Postgres + Redis
  → intelligence engine → REST + WebSocket → one React dashboard. Nothing that
  cannot run on a laptop in a warehouse office. The seam that makes it real:
  `GET /api/internal/context/{truckId}` is the single contract between the data
  platform and the intelligence engine, so they can never disagree about what a
  truck is experiencing.
- **B2 · Provenance of data.** 17 openly licensed sources (geography 4, weather 3,
  food science 4, emissions 2, routing, impact, physics and operational 1 each),
  catalogued and served live at `/api/opendata`.
- **B3 · Offline and reproducible.** One command (`make demo`). With no API key
  the system still runs end to end; only the prose is plainer. `make test` runs
  the pytest suite (120 tests in `tests/` as of 2026-09-26; SQLite, LLM mocked) and `tests/test_demo.py`
  replays the whole failure. Beyond food: the condition engine is configured per
  product profile, so the same exposure → integrity → risk logic extends to
  pharmaceuticals and vaccines later, without diluting the food demo today.

# Thermal Trace — the five-minute pitch

The words for the pitch. The built deck is **[docs/deck/index.html](../docs/deck/index.html)**
(open it in a browser: ← → to move, F fullscreen, N speaker notes, O overview,
P print to PDF; a PDF export sits next to it). The landing page
(`landing/src/content/copy.ts`) mirrors this file, so edit here first. Brand rules:
[docs/brand/README.md](../docs/brand/README.md).

**Hard limit: 5 minutes, then 2 minutes of Q&A.** Eight numbered slides, a
two-minute live demo, and the team slide. Everything else is a backup slide
behind the team slide, shown only if a judge asks.

| Time | Slide |
|---|---|
| 0:00–0:10 | 1 · Title |
| 0:10–0:40 | 2 · Problem + UN SDGs |
| 0:40–1:00 | 3 · Why here (Qatar) |
| 1:00–1:15 | 4 · The product in one line |
| 1:15–3:15 | **Live demo** (see [DEMO_SCRIPT.md](DEMO_SCRIPT.md)) |
| 3:15–3:35 | 5 · Physics before AI |
| 3:35–3:55 | 6 · AI where it earns its place |
| 3:55–4:20 | 7 · Thermal reserve |
| 4:20–4:45 | 8 · What's different + open source |
| 4:45–5:00 | Team slide; leave it up for questions |

**1. Thermal Trace.**
*Know what a failing fridge is costing before the gate does.* A condition-aware
cold-chain decision system: it watches food in transit, measures how much safe
life a failure has cost, and chooses the action that loses the least of it.

**2. The problem.**
13 % of food is lost between harvest and retail; another 19 % is wasted after.
Food loss and waste cause 8–10 % of global emissions. *(FAO/UNEP 2024.)* Say the
goal out loud: this is **UN SDG target 12.3** (halve food waste, cut loss along
supply chains), and it serves **SDG 2** (food security) and **SDG 13** (climate).

**3. Why here.**
Qatar imports most of its fresh food across a summer that passes 45 °C. A truck
fridge that fails at noon can spoil a load in hours. The National Food Security
Strategy 2030 targets −50 % food waste and −30 % food loss.

**4. The product in one line.**
Sensors tell us what is happening; mathematics tells us how much damage has
occurred; models predict what happens next; optimization chooses the action; the
decision engine turns it into an operation; and the food-loss engine proves what
it saved. *Then: "Let us show you."*

**Live demo (2 minutes).** T102, 500 kg of fresh chicken, refrigeration failure
(triggered at the start of the talk so the cargo is already warm). Command
Center → Model → Optimization → Food Loss. Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

**5. Physics before AI.**
Thermal exposure is the sum of the degrees above the limit over time.
Deterioration is an Arrhenius rate relative to the product's ideal temperature.
Remaining shelf life follows from it. Every one of those numbers is
deterministic Python — no model touches them.

**6. AI where it earns its place.**
Two AI layers, neither allowed to invent a number. **Laya** (System 1) is a
local, offline, Apache-2.0 decision model: it answers typed questions —
condition, action, urgency, needs human review — and never generates text; it
corroborates the deterministic decision and never overrides it. **DeepSeek
V4.1 Flash** (System 2, a cloud model reached through OpenRouter) is the
explainer: it turns the calculated facts into plain language, may only rank
feasible options, and may move the spoilage estimate only within a fixed band.

**7. Every delivery arrives with its thermal reserve.**
For the supermarket. Thermal reserve is the safe shelf life a load has left,
calculated from every minute of its temperature history (`L·(1 − D)`), not the
label date. Inventory: shelve by reserve, and surplus is flagged for transfer,
discount or redistribution. Finance: loss prevented in QAR. Receiving: accept or
reject on evidence. *(The 7.0 vs 4.5 day bars are illustrative.)*

**8. What's different.**
Monitoring stops at the alert; we start there. Alert-only monitoring records the
temperature and raises an alarm. Thermal Trace measures the damage already done,
chooses where to divert under constraints, records the action, proves the food
saved, and labels every number with its source. And it is open: MIT licence, 17
openly licensed data sources, runs offline on one laptop (`make demo`), 120
automated tests. SDG 12.3 · 2 · 13.

**Team 2 · Thank you.** Najeeb Abdi (math, frontend), Islambek (hardware),
Param Anand Trimbake (frontend), Ahad Hussain (AI). Repository link on the slide.
Leave it up during questions.

---

### Backup slides (behind the team slide, press →)

- **B1 · What goes wrong.** The illustrative noon-to-gate timeline.
- **B2 · Detect.** Command-center screenshot. *It was taken in mock mode and is
  labelled so; retake it from the live stack (`make demo`) before relying on it.*
- **B3 · Optimization.** `min(transport + food-loss + delay)` subject to ETA ≤
  remaining safe time, capacity and temperature; WH01 / WH02 / WH03 example ETAs.
- **B4 · The number that matters.** `food saved = (loss_without − loss_with) × quantity`.
- **B5 · Provenance.** MEASURED, CALCULATED, PREDICTED, OPTIMIZED, AI-EXPLAINED, SYNTHETIC.
- **B6 · Architecture.** Sensors (a test simulator in the demo) → MQTT → FastAPI
  ingestion → Postgres + Redis → intelligence engine → REST + WebSocket → one
  React dashboard. `GET /api/internal/context/{truckId}` is the single contract
  between the data platform and the intelligence engine.
- **B7 · Open data.** 17 openly licensed sources, served live at `/api/opendata`.

### Q&A — one-sentence answers

- **How are you different from Sensitech / Tive / Controlant?** They monitor and
  alert; we turn the alert into a measured damage figure, an optimized diversion
  and a proven saving — and it is open source and runs offline.
- **Where would real sensors come from?** Anything that publishes to MQTT: a
  standard reefer logger or an ESP32 probe (see `firmware/`); the simulator
  publishes the exact same message, so nothing downstream changes.
- **Are the Arrhenius constants validated?** No — they are literature values,
  labelled unverified. The model is prototype-grade, not certified food-safety
  science; a pilot would calibrate them per product.
- **Where does the CO₂ figure come from?** Food saved × 2.5 kg CO₂e per kg,
  the FAO 2013 global average for wasted food (3.3 Gt CO₂e over 1.3 Gt). It is a
  cited factor (`CC_CO2E_KG_PER_KG_FOOD`), not a measurement, and conservative
  for chicken, whose footprint per kg is higher.
- **Why use an LLM at all?** Only to explain. It cannot produce a number, may
  only rank feasible options, and the system runs end to end without it.
- **What's next?** One cold-chain operator, one month, twenty pallets: on day one
  we can tell them how much of their loss is refrigeration and how much is scheduling.

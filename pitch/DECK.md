# Thermal Trace — thirteen slides

The words for the pitch. The built deck is **[docs/deck/index.html](../docs/deck/index.html)**
(open it in a browser: ← → to move, F fullscreen, N speaker notes, O overview,
P print to PDF; a PDF export sits next to it). The landing page
(`landing/src/content/copy.ts`) mirrors this file, so edit here first. Brand rules:
[docs/brand/README.md](../docs/brand/README.md).

Non-technical. One number per slide where possible, each with its source or a
EXAMPLE / ILLUSTRATIVE tag. **Hard limit: 5 minutes in total, then 2 minutes of
Q&A.** Thirteen slides in about three minutes (roughly 15 seconds each, one
sentence per slide), then a two-minute live demo, then the team slide.

**1. Thermal Trace.**
*Know what a failing fridge is costing before the gate does.* A condition-aware
cold-chain decision system: it watches food in transit, measures how much safe
life a failure has cost, and chooses the action that loses the least of it.

**2. The problem.**
13 % of food is lost between harvest and retail; another 19 % is wasted after.
Food loss and waste cause 8–10 % of global emissions. *(FAO/UNEP 2024.)* Say the
goal out loud: this is **UN SDG target 12.3** (halve food waste, cut loss along
supply chains); it also serves **SDG 2** (food security) and **SDG 13** (climate).

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
occurred; models predict what happens next; optimization chooses the action; the
decision engine turns it into an operation; and the food-loss engine proves what
it saved.

**6. Detect at the moment of failure.**
A live map of every truck, with an incident the instant a temperature leaves the
safe band and stays there. Not a dashboard of charts — a decision surface.
*(The screenshot was taken in mock mode and is labelled so; retake it from the
live stack with `make demo` when there is time.)*

**7. Physics before AI.**
Thermal exposure is the sum of the degrees above the limit over time.
Deterioration is an Arrhenius rate relative to the product's ideal temperature.
Remaining shelf life follows from it. Every one of those numbers is
deterministic Python — no model touches them.

**8. AI where it earns its place.**
Two AI layers, neither allowed to invent a number. **Laya** (System 1) is a
local, offline, Apache-2.0 decision model: it answers typed questions —
condition, action, urgency, needs human review — and never generates text; it
corroborates the deterministic decision and never overrides it. **DeepSeek
V4.1 Flash** (System 2, a cloud model reached through OpenRouter) is the
explainer: it turns the calculated facts into plain language, may only rank
feasible options, and may move the spoilage estimate only within a fixed band.
Around them, plain deterministic code (not AI): spoilage probability, anomaly
detection and demand forecasting.

**9. Optimization, not vibes.**
`min(transport + food-loss + delay)` subject to ETA ≤ remaining safe time,
warehouse capacity and temperature compatibility. Three cold stores in range
(WH01 18 min, WH02 27 min, WH03 46 min — example scenario ETAs); the optimizer
picks WH01 and the decision is DIVERT. The model only explains the choice.

**10. The number that matters.**
Food saved (kg) and financial loss prevented (QAR): expected loss without the
intervention minus expected loss with it, times the quantity. That is the whole
point. *(Bars on the slide are illustrative; the real figure is the one the live
demo computes after slide 13.)*

**11. Every delivery arrives with its thermal reserve.**
For the supermarket. Thermal reserve is the safe shelf life a load has left,
calculated from every minute of its temperature history (`L·(1 − D)`), not the
label date. Inventory: shelve by reserve, and surplus is flagged for transfer,
discount or redistribution before it expires. Finance: loss prevented in QAR
for every intervention; mark down early instead of writing off late. Receiving:
a temperature record for every delivery, so the dock accepts or rejects on
evidence. *(The 7.0 vs 4.5 day bars are illustrative.)*

**12. Every value knows where it came from.**
MEASURED, CALCULATED, PREDICTED, OPTIMIZED, AI-EXPLAINED, SYNTHETIC — shown on
screen. Test data is never dressed up as a real measurement, and
literature values are marked as unverified.

**13. What's different.**
Monitoring stops at the alert; we start there. Alert-only monitoring records the
temperature and raises an alarm. Thermal Trace measures the damage already done,
chooses where to divert under constraints, records the action, proves the food
saved, and labels every number with its source. And it is open: MIT licence, 17
openly licensed data sources, runs on one laptop (`make demo`), 120
automated tests. SDG 12.3 · 2 · 13.

**Live demo (2 minutes)** — after slide 13, switch to the dashboard: T102, 500 kg
of fresh chicken, refrigeration failure. Follow [DEMO_SCRIPT.md](DEMO_SCRIPT.md),
then come back to the deck and press **End** for the team slide (it skips the
two backup slides).

---

### Backup slides (between slide 13 and the team slide)

- **B1 · Architecture.** Sensors (a test simulator in the demo) → MQTT → FastAPI ingestion → Postgres + Redis
  → intelligence engine → REST + WebSocket → one React dashboard. Nothing that
  cannot run on a laptop in a warehouse office. The seam that makes it real:
  `GET /api/internal/context/{truckId}` is the single contract between the data
  platform and the intelligence engine, so they can never disagree about what a
  truck is experiencing.
- **B2 · Provenance of data.** 17 openly licensed sources (geography 4, weather 3,
  food science 4, emissions 2, routing, impact, physics and operational 1 each),
  catalogued and served live at `/api/opendata`.

### Closing slide (last)

**Team 2 · Thank you.** Reboot the Earth hackathon · CMUQ. Najeeb Abdi (math,
frontend), Islambek (hardware), Param Anand Trimbake (frontend), Ahad Hussain
(AI), Robin Thomas (business, product), and the repository link. Leave it up during questions.

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
- **Does it run offline?** The numbers do: sensors, maths, risk, optimizer and
  food loss need no cloud service. The first `make demo` downloads images and
  models; after that only the map tiles and the AI explanation use the internet,
  and without them the map is blank and the explanation falls back to a template.
- **Why use an LLM at all?** Only to explain. It cannot produce a number, may
  only rank feasible options, and the system runs end to end without it.
- **What's next?** One cold-chain operator, one month, twenty pallets: on day one
  we can tell them how much of their loss is refrigeration and how much is scheduling.

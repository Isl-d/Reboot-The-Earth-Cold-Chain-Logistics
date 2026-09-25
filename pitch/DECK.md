# Twelve slides

Non-technical. One number per slide where possible.

**1. The one-sentence product.**
A condition-aware cold-chain decision system: it watches food in transit, measures
how much safe life a failure has cost, and chooses the action that loses the
least of it.

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

**5. The product in one line.**
Sensors tell us what is happening; mathematics tells us how much damage has
occurred; AI predicts what happens next; optimization chooses the action; and the
food-loss engine proves what it saved.

**6. Detect at the moment of failure.**
A live map of every truck, with an incident the instant a temperature leaves the
safe band and stays there. Not a dashboard of charts — a decision surface.

**7. Physics before AI.**
Thermal exposure is the integral of the degrees above the limit over time.
Deterioration is an Arrhenius rate. Remaining shelf life follows from it. Every
one of those numbers is deterministic Python — no model touches them.

**8. AI where it earns its place.**
Prediction (spoilage probability), anomaly detection, demand forecasting, and one
optional model — LAYLA — that turns the calculated facts into an explanation.
It is bounded: it may never invent a temperature, an ETA, a cost or a quantity.

**9. Optimization, not vibes.**
`min(transport + food-loss + delay)` subject to ETA ≤ remaining safe time,
warehouse capacity and temperature compatibility. The optimizer picks the
warehouse. The model only explains the choice.

**10. The number that matters.**
Food saved (kg) and financial loss prevented (QAR): expected loss without the
intervention minus expected loss with it. That is the whole point.

**11. Every value knows where it came from.**
MEASURED, CALCULATED, PREDICTED, OPTIMIZED, AI-EXPLAINED, SYNTHETIC — shown on
screen. Synthetic demo data is never dressed up as a real measurement, and
literature values are marked as unverified.

**12. The ask.**
One cold-chain operator, one month, twenty pallets. On day one we can tell you
how much of your loss is refrigeration and how much is scheduling.

---

### Backup slides

- **Provenance of data.** 17 openly licensed sources (geography, routing,
  weather, food science, emissions) catalogued and served live at `/api/opendata`.
- **The seam that makes it real.** `GET /api/internal/context/{truckId}` is the
  single contract between the data platform and the intelligence engine, so they
  can never disagree about what a truck is experiencing.
- **Offline by design.** Mosquitto, Postgres/Timescale, Redis, Python and React.
  With no API key the system still runs end to end; only the prose is plainer.
- **Reproducibility.** One command (`make demo`), a reference scenario, and an
  end-to-end test (`tests/test_demo.py`) that replays the whole failure.
- **Beyond food.** The condition engine is configurable per product profile; the
  same exposure → integrity → risk logic extends to pharmaceuticals and vaccines
  later, without diluting the food demo today.
- **Architecture.** Simulator → MQTT → FastAPI ingestion → Postgres + Redis →
  intelligence engine → REST + WebSocket → one React dashboard. Nothing that
  cannot run on a laptop in a warehouse office.
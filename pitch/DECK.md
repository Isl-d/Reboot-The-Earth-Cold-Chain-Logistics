# Thermal Trace — pre-seed deck, twenty-two slides

The words for the pitch. The built deck is **[docs/deck/index.html](../docs/deck/index.html)**
(open it in a browser: ← → to move, F fullscreen, N speaker notes, O overview,
P print to PDF). The landing page (`landing/src/content/copy.ts`) mirrors this
file, so edit here first. Brand rules: [docs/brand/README.md](../docs/brand/README.md).

This is the pre-seed version: the hackathon deck proved the technology; this one
proves the value and lands the ask. Every number carries its source or an
EXAMPLE / ILLUSTRATIVE / TARGET tag. Twenty-one numbered slides and a closing
slide, no backups. Slides 15–20 are the ask: the amount, then exactly where the
money goes and what it proves; slide 21 closes on the vision. Figures come from the pre-seed budget.

**1. Thermal Trace.**
*Know what a failing fridge is costing before the gate does.* Cold-chain
intelligence: physical risk and commercial value, in one reserve. Pre-seed ·
QAR 1.85M · Qatar first, GCC next. Presented by **Generative Gains** (logo top
right, `docs/deck/assets/generative-gains.png`).

**2. The problem.**
13 % of food is lost between harvest and retail; another 19 % is wasted after
*(FAO/UNEP 2024)*. **UN SDG 12.3**, and SDG 2 and 13. Qatar summers pass 45 °C;
the National Food Security Strategy 2030 targets −30 % food loss. Today's systems
raise an alarm; none of them says how much value is left.

**3. Why here: an import-dependent region, a brutal summer.**
Climate and imports: maritime and overland imports, customs holds, border queues
and 42 °C afternoons all add thermal debt (shelf life spent before the shelf).
Policy tailwind: TASMU National Food Security Analytics and Qatar's National Food
Security Strategy target efficient supply chains and less food waste. Thermal
Trace is the operator-level layer that complements national systems.

**4. Redefining the perishable asset.**
The biological clock (defensive, today): inventory is a degrading liability
managed by a printed expiry date, so the result is late markdowns and
write-offs. The commercial trace (offensive, Thermal Trace): inventory is an
asset with a live value, priced from its real thermal history and live demand,
so value is recovered before it is lost.

**5. The anatomy of value: four reserves, one stack.**
Layer 1 **Thermal Trace** (ground truth): a continuous, timestamped memory of
temperature exposure and stress. Layer 2 **Thermal Reserve** (the envelope): the
physical budget left before quality is compromised. Layer 3 **Commercial
Reserve** (the velocity): the economic runway, `CR = Qr × Pr × Vr`. Layer 4
**Decision Reserve** (the action window): the time left to act before the good
options disappear. Safety rules stay deterministic; commercial optimisation runs
inside them.

**6. Two clocks, one platform.**
Two divisions. The physical clock, **Thermal Reserve**, for 3PLs, fleets and
warehouses: sensors and edge gateways record the Thermal Trace and give a live
countdown, e.g. 45 minutes left. The commercial clock, **Commercial Reserve**,
for hypermarkets and HORECA: joins the physical state with POS, ERP and WMS to
route stock and price it to clear. Thermal Reserve is the entry point;
Commercial Reserve follows as a controlled extension. *(45 minutes is an
example.)*

**7. Six signals. Three numbers that matter.**
**Temperature** and **humidity** come from a real DHT11 node today (about
±2 °C); the designed upgrade is DS18B20 probes at ceiling and floor, so a warm
layer shows up instead of hiding in an average, and an SHT3x for humidity.
**Shock and tilt** (3-axis MEMS) is simulated today and designed in hardware,
because bruising from a dropped pallet is damage a thermometer never sees. Then
the designed next layer: **gas** (metal-oxide, VOC and ethylene), **NIR**
(700–2500 nm) for internal bruising, and an **RGB camera** for colour shift,
mould and shelf count. They feed deterioration detection, Remaining Useful
Time and thermal exposure. *(Temperature and humidity flow from the real node today; shock is
simulated; gas, NIR and vision are designed, not built.)*

**8. Layers 1–2 · The label says 7 days. The trace says 4.5.**
Thermal exposure `E_T = Σ max(0, T − T_safe)·Δt`; Arrhenius deterioration
`k(T)`; shelf life spent `D = Σ k·Δt`; Thermal Reserve `L·(1 − D)`.
Deterministic Python, no AI model touches them. *(7.0 vs 4.5 days is an
example; constants are literature values, calibrated per product in the pilot.)*

**9. Layer 3 · Safe is not the same as sellable.**
Two clocks. Thermal Reserve, the physical clock: product health ("can it still
be consumed?"), production → transport → deterioration → shelf-life boundary,
protect physical life. Commercial Reserve, the commercial clock: economic life
("can it still earn its value?"), arrival → customer exposure → sell-through →
replenishment, protect economic life. Health creates the possibility of selling;
demand creates the possibility of realising value; Commercial Reserve lives
where they meet. `CR = Qr × Pr × Vr`: quantity realistically realisable ×
probability of sale × expected value per unit. Estimates carry uncertainty;
food-safety release stays with authorised people.

**10. Layer 3 · In transit until the profit is booked.**
Kinetic transit (on the truck: Thermal + Decision Reserve), static transit (on
the shelf: Commercial Reserve), consumer transit (into the cart: value
realised), consolidation (POS data flows back, profit hits the ledger, demand
triggers replenishment: Value Ledger). *(The value curve is illustrative.)*

**11. Layer 4 · The window to act, and the move to make.**
`min(transport + food-loss + delay)` subject to ETA ≤ remaining thermal reserve,
capacity and temperature compatibility. A reefer's compressor is failing with 45
minutes of Thermal Reserve; the hypermarket is 90 minutes away (spoils), a buyer
is 20 minutes away (fits): REROUTE, with about 25 minutes to commit. The
optimizer picks; the AI corroborates and explains, and never invents a number.
*(Example scenario.)*

**12. Two AI layers. Neither may invent a number.**
**Laya** (System 1, local, offline, Apache-2.0) answers typed questions in a
single pass (condition, action, urgency, needs human review) and never
generates text; it corroborates the deterministic decision and never overrides
it. Laya is a base model, so its confidence is shown as uncalibrated.
**DeepSeek V4.1 Flash** (System 2, a cloud model via OpenRouter) turns the
calculated facts into plain language, may only rank feasible options, and may
move the spoilage estimate only within a fixed band. Around them, plain code,
not AI: the spoilage prior, anomaly detection and a demand baseline.

**13. From managing biology to managing liquidity.**
Legacy vs Thermal Trace. Goal: delay spoilage vs maximise yield. Asset view: a
degrading object vs an asset with a live, priced value. Inventory rule: FEFO by
printed date vs **LCRFO** (planned: lowest Commercial Reserve, first out) by
live physics. Intervention: passive alarms vs optimized routing today and early
markdowns planned.
Waste: an invisible operating tax vs a quantified, bounded value at risk.

**14. Priced against verified value.**
Pilot, 12–16 weeks: QAR 100–175K. Enterprise subscription: QAR 120–240K a year,
plus implementation fees. The value test: avoided loss ≥ 3× the fee (QAR 540K of
benefit for a QAR 180K fee). Month-12 target: QAR 300–500K contracted ARR.
*(Prices are hypotheses to validate, not market prices; the ARR is a target, not
a forecast.)*

**15. The ask: twelve months to prove it in the field.**
**QAR 1,850,000** (≈ US$508,000), 12 months, pre-seed or strategic round. Core
five-person engineering team 55.1 %; sensors, deployment, cloud and integration
23.5 %; validation, customers and legal 10.8 %; contingency reserve 10.5 %. It
buys: an anchor customer live at 3–5 facilities, avoided loss measured at ≥ 3×
the fee, Commercial Reserve tested in controlled trials, an annual contract and
a second customer, and the QAR 300–500K ARR target. Every kilogram saved is
logged as evidence toward SDG 12.3.

**16. The ask · Every riyal, from round to line item.**
A flow from QAR 1.85M into four groups and nine lines: engineering team
1,020,000 (55.1 %); hardware and platform 435,000 (sensors and edge 155,000,
deployment and calibration 95,000, cloud, data and security 100,000,
enterprise integration 85,000); validation and go-to-market 200,000
(food-domain validation 65,000, customer development 70,000, legal, IP and
readiness 65,000); contingency 195,000 (10.5 %).

**17. The ask · Five engineers, QAR 76,000 a month.**
CTO / systems and product architect (architecture, scope, data contracts,
security, delivery) QAR 20,000 a month; thermal intelligence / data engineer
(thermal state, exposure, risk models, shelf-life logic) 16,000; backend and
data platform engineer (ingestion, databases, APIs, identity, integrations)
15,000; IoT and edge engineer (sensors, gateways, connectivity, calibration)
13,000; application and workflow engineer (operator UI, alerts, approvals, ERP
and WMS workflows) 12,000. Gross QAR 76,000 a month, 912,000 a year, plus about
109,000 of employment costs: about QAR 1,020,000. The CEO leads investors,
anchor customers and sales; food-safety experts are hired fractionally from the
validation line. *(Lean planning assumptions, not guaranteed market rates.)*

**18. The ask · The other QAR 830K, line by line.**
Sensors and gateways for 3–5 facilities (cold rooms, reefer trucks, dispatch
areas) 155,000; install, calibrate and test outages and alerts 95,000; 12
months of hosting, storage and security 100,000; a few high-value flows into
product, shipment, ERP and WMS records 85,000; fractional food-safety experts
65,000; the anchor pilot from site survey to conversion 70,000; data-access
agreements, contracts and IP 65,000; contingency 195,000, released only with
documented founder and investor approval.

**19. The ask · From pilot to recurring revenue.**
M1–2 secure the pilot, survey sites, agree how value is measured, build the
baseline. M3–4 install devices, build ingestion and asset history, test outages
and alerts. M5–6 run excursion logic, risk estimates and the approved
intervention workflow. M7–9 compare to baseline, quantify value, start
controlled Commercial Reserve tests. M10–12 convert to an annual contract and
pursue a second customer. The team runs at about QAR 85K a month throughout;
the other lines follow the work *(phasing indicative)*. The pilot must prove
measured avoided loss ≥ 3× the fee; month-12 target QAR 300–500K contracted ARR
*(a target, not a forecast)*.

**20. The ask · Known risks, planned responses.**
Customer data access → sign data access and a named sponsor first. False
precision → validated assumptions, uncertainty shown, domain review. Integration
complexity → a few high-value data flows, clear contracts. Long sales cycle →
named decision-makers, success criteria, conversion terms. Building both
divisions too early → Thermal Reserve first, Commercial Reserve staged. Behind
it, the 10.5 % contingency (QAR 195,000), spent only with documented approval.

**21. One primitive, many industries.**
Trace → State → Reserve → Decision applies to any asset that deteriorates, cures
or loses viability under the stress of time: biopharma (stability budgets),
energy (grid flexibility reserve), space cargo (mission reserve), defence
(operational readiness). Built first for the food cold chain. The closing vision: what we have today comes first, the future last. *(Vision, not
built.)*

### Closing slide

**Thank you.** Thermal Trace, by Generative Gains (logo top right). Generative
Gains is raising QAR 1.85M to prove Thermal Trace in the field: that what a
failing fridge costs can be measured and recovered. Najeeb Abdi (math,
frontend), Islambek (hardware), Param Anand Trimbake (frontend), Ahad Hussain
(AI), Robin Thomas (business, product). Leave it up during questions.

### Q&A — one-sentence answers

- **Does it run today?** Yes, on one laptop (`make demo`): sensor → Thermal
  Trace → Thermal Reserve → reroute decision, with 123 automated tests. Live
  demo: [DEMO_SCRIPT.md](DEMO_SCRIPT.md).

- **How are you different from Sensitech / Tive / Controlant?** They monitor and
  alert; we turn the alert into a measured damage figure, a Commercial Reserve
  and an optimized decision, and log the value it recovered.
- **Is Commercial Reserve built?** Not yet in full: the physical layers and the
  rerouting decision run today; Commercial Reserve is staged in the pilot,
  expiry-aware prioritisation first and automated pricing later.
- **Where would real sensors come from?** Anything that publishes to MQTT: a
  standard reefer logger or an ESP32 probe (see `firmware/`); the simulator
  publishes the exact same message, so nothing downstream changes.
- **Are the Arrhenius constants validated?** No — they are literature values,
  labelled unverified. The model is prototype-grade, not certified food-safety
  science; the pilot calibrates them per product.
- **Why should a customer pay?** Because we price against measured avoided loss:
  if the pilot does not show at least 3× the fee against an agreed baseline, the
  case for the subscription is not made.
- **Why use an LLM at all?** Only to explain. It cannot produce a number, may
  only rank feasible options, and the system runs end to end without it.
- **What's next?** One anchor customer, 3–5 facilities, 12 months: on day one we
  can tell them how much of their loss is refrigeration and how much is
  scheduling, and by month 9 what the system recovered.

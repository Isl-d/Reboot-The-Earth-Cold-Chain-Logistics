# Thermal Trace — the four-minute demo

One presenter drives; one person keeps the terminal ready. Rehearse twice.
The demo runs at the **LIVE DEMO** slide of the deck
([docs/deck/index.html](../docs/deck/index.html)), between slides 9 and 10;
after `make reset`, switch back to the deck and press → for slide 10.

The story is one truck and one failure: **T102 loses its refrigeration in
transit, the system detects it, measures the damage, predicts the risk, chooses
a cold store, diverts, and proves how much food it saved.**

## Five minutes before

```bash
make laya-pull       # once, before the event: ~1.4 GB of Laya checkpoints
make demo            # broker, database, redis, laya, backend, simulator, frontend
make reset           # everyone back to NORMAL
```

- [ ] Deck open in a second browser window at the LIVE DEMO slide
      (`docs/deck/index.html#10`), fullscreen with **F**.
- [ ] Dashboard open at **http://localhost:5173**; `LIVE` pill green.
- [ ] `make watch` in a side terminal shows `coldchain/trucks/.../telemetry`.
      Close it before you start talking.
- [ ] Open **Command Center**. T102 is moving, ~3–4 °C, risk LOW.
- [ ] Have the API docs open in a second tab (**http://localhost:8000/docs**)
      in case a judge asks what the numbers are.

## On stage

| Time | You do | They see | You say |
| --- | --- | --- | --- |
| 0:00 | — | Four trucks on the Doha map, temperatures in mono type, risk badges | "Every one of these is a pallet of food. We know its temperature, its location, and how much safe life it has left." |
| 0:20 | Click **T102** | 500 kg of fresh chicken, safe 0–4 °C, currently 3.8 °C, risk LOW | "This one is carrying five hundred kilos of chicken. Right now it is fine." |
| 0:40 | `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102` | Temperature climbs 3.8 → 4.4 → 5.1 → 5.9 → 6.7 → 7.4 °C | "Its refrigeration just failed. Watch the cargo warm." |
| 1:00 | — | An incident opens; risk climbs through MEDIUM to HIGH/CRITICAL | "The system caught the deviation immediately — not at the gate, now." |
| 1:20 | Open **Model** | Chain cards: temperature → thermal exposure → deterioration → remaining shelf life → spoilage → risk, each with a **provenance badge**; below them a **System 1 — Laya** card | "These are physics, not guesses. Thermal exposure is the integral of the degrees above the limit over time. Deterioration is an Arrhenius rate. The local System-1 model, Laya, reads the same facts and agrees — refrigeration failure, divert — and it cannot invent a number, because it never writes text." |
| 2:00 | Open **Optimization** | WH01 18 min, WH02 27 min, WH03 46 min, with ETA, expected loss and a checked-then-selected candidate | "Three cold stores are in range. The optimizer minimizes transport plus food-loss plus delay, subject to ETA, capacity and temperature. It picked WH01." |
| 2:30 | Open **Truck detail → recommendation** | `DIVERT → WH01`, ETA, and the AI explanation (OpenRouter) | "The model did not choose this. The optimizer did. The language model only explains it — it is never allowed to invent a number." |
| 3:00 | Open **Food Loss** | WITHOUT vs WITH the intervention; food saved (kg) and loss prevented (QAR) climbing | "Do nothing and we risk a large share of the load. Divert and we lose only the transit cost. That is real chicken the store can still sell, and real money not thrown away." |
| 3:30 | Open **Comparison** | The two bars, without vs with, side by side | "This is the whole product in one picture: the sensors told us what was happening, the maths told us how bad it was, the optimizer told us what to do, and the food-loss engine proves it mattered." |
| 3:50 | `make reset` | T102 returns to NORMAL, incident resolves | "Same platform, next truck." |

## If something fails

- **No telemetry?** `make sim-logs`. If the broker is down, `make demo` again.
- **Frontend blank?** Confirm the backend is on :8000 and reload; the vite proxy
  forwards `/api` and `/ws`.
- **No LLM key?** The explainer falls back to a template explanation — the numbers are
  identical, only the prose is plainer. Say so.
- **Want a repeatable check without the UI?** `make test` runs the whole
  refrigeration-failure story headless (`tests/test_demo.py`).

## One sentence to close

> The sensors tell us what is happening. Mathematics tells us how much damage
> has occurred. AI predicts what happens next. Optimization chooses the action.
> The food-loss engine proves it saved real food.

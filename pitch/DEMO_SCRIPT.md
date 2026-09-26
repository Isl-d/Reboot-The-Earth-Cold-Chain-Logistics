# Thermal Trace — the two-minute demo

The whole pitch is **5 minutes**; the demo gets **2:00** of it, between slide 4
(**The product**) and slide 5 (**Physics before AI**) of the deck
([docs/deck/index.html](../docs/deck/index.html)). One presenter drives; one
person keeps the terminal ready. Rehearse the full five minutes with a stopwatch.

The story is one truck and one failure: **T102 loses its refrigeration in
transit, the system detects it, measures the damage, chooses a cold store, and
proves how much food it saved.**

## Before the talk

```bash
make laya-pull       # once, before the event: ~1.4 GB of Laya checkpoints
make demo            # broker, database, redis, laya, backend, simulator, frontend
make reset           # everyone back to NORMAL
```

- [ ] Deck open in one window at slide 1, fullscreen with **F**.
- [ ] Dashboard open at **http://localhost:5173** on the Command Center; `LIVE` pill green.
- [ ] Backup screen recording of this demo open and ready to play.
- [ ] **Rehearsal check:** time how long T102 takes to reach HIGH after the
      trigger. That is how early you must trigger it on the day.

## On stage

| Time | You do | They see | You say |
| --- | --- | --- | --- |
| Talk start (0:00) | Terminal person runs `make scenario SCENARIO=REFRIGERATION_FAILURE TRUCK=T102` | — (deck is on screen) | — |
| 1:15 | Switch to the dashboard: **Command Center** | Trucks on the Doha map; T102 with an open incident, temperature above 4 °C | "This truck carries 500 kg of chicken. Its refrigeration failed while we were talking. The system caught it the moment the cargo left the safe band — not at the gate." |
| 1:45 | Open **Model** | Temperature → thermal exposure → deterioration → shelf life → risk, each with a provenance badge; the Laya System-1 card | "This is physics, not guessing: exposure is the degrees above the limit over time, deterioration is an Arrhenius rate. The local AI reads the same facts and agrees — but it cannot invent a number." |
| 2:15 | Open **Optimization** | WH01 / WH02 / WH03 with ETA and expected loss; WH01 selected, `DIVERT` | "Three cold stores in range. The optimizer minimizes transport plus food loss plus delay, under ETA, capacity and temperature. It picked WH01. The language model only explains why." |
| 2:45 | Open **Food Loss** | Food saved (kg), loss prevented (QAR), CO₂ avoided | "Without action we lose most of the load. With the diversion we save this much food, this much money, and this much CO₂ — computed, not estimated." |
| 3:15 | Switch back to the deck, → slide 5 | — | "Here is what you just saw, under the hood." |

`make reset` after the talk, not on stage.

## If something fails

- **Anything breaks on stage?** Do not debug live. Play the backup recording and
  keep talking over it; the clock does not stop.

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

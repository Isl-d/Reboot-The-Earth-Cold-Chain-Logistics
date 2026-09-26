# Thermal Trace — the two-minute demo

The whole pitch is **5 minutes**; the demo gets **2:00** of it, after slide 13
(**What's different**) of the deck ([docs/deck/index.html](../docs/deck/index.html)).
After the demo, switch back to the deck and press **End** for the team slide.
One presenter drives; one person keeps the terminal ready. Rehearse the full
five minutes with a stopwatch.

The story is one hot afternoon in Doha, and one truck that needs a decision:
**T102 loses its refrigeration in transit, the system detects it, measures the
damage, chooses a cold store, and proves how much food it saved.** Around it,
the rest of the fleet shows the system triages rather than panics:

| Truck | Cargo | What happens (`make present`) | On screen at 3:00 |
| --- | --- | --- | --- |
| T101 | 700 kg chicken | nothing: the healthy reference | LOW |
| T102 | 500 kg chicken | +20 s refrigeration failure, 38 °C ambient | CRITICAL, open incidents |
| T103 | 800 kg milk | +10 s door left open, +40 s driver closes it | recovered to LOW; incidents resolved |
| T104 | 1,200 kg lettuce | +0 s stuck in traffic, cargo still cold | LOW, one LOW traffic incident |

## Before the talk

```bash
make laya-pull       # once, before the event: ~1.4 GB of Laya checkpoints
make demo            # broker, database, redis, laya, backend, simulator, frontend
make present-check   # the live feed is fresh and exactly ONE simulator runs
```

`make present-check` exists because a stalled feed looks fine at a glance: the
dashboard keeps showing the last readings. It fails loudly if no telemetry has
arrived in 15 s, and warns if two simulators are running (the trucks flicker
between two different stories).

- [ ] Deck open in one window at slide 1, fullscreen with **F**.
      The demo starts after slide 13 (`docs/deck/index.html#13`).
- [ ] Dashboard open at **http://localhost:5173** on the Command Center; `LIVE` pill green.
- [ ] Backup screen recording of this demo open and ready to play.
- [ ] **Rehearsal check:** run `make present` once end to end. It prints
      `READY` (about a minute after the trigger) with the optimization and
      food-loss numbers the backend computed. Then `make reset`.

## On stage

| Time | You do | They see | You say |
| --- | --- | --- | --- |
| Talk start (0:00) | Terminal person runs `make present` and leaves it open. It resets the fleet, plays the timeline, prints `READY`, then keeps watching the feed | — (deck is on screen) | — |
| 3:00 | After slide 13, switch to the dashboard: **Command Center** | Four trucks on the Doha map. T104 delayed but cold, T103 recovered, T102 CRITICAL with open incidents | "Four trucks, one afternoon. This one is stuck in traffic, but its lettuce is still cold, so the system does not raise a false alarm. This milk truck had its door left open; the driver closed it and the system recorded the exposure. And T102 — 500 kg of chicken — lost its refrigeration while we were talking. The system caught it the moment the cargo left the safe band, not at the gate." |
| 3:30 | Open **Model** | Temperature → thermal exposure → deterioration → shelf life → risk, each with a provenance badge; the Laya System-1 card | "This is the physics from the slides, live. The local AI reads the same facts and agrees — but it cannot invent a number." |
| 4:00 | Open **Optimization** | WH01 / WH02 / WH03 with ETA and expected loss; WH01 selected, `DIVERT` | "Three cold stores in range. The optimizer picked WH01 under ETA, capacity and temperature. The language model only explains why." |
| 4:30 | Open **Food Loss** | Food saved (kg), loss prevented (QAR), CO₂ avoided | "Without action we lose most of the load. With the diversion we save this much food, this much money, and this much CO₂ — computed, not estimated." |
| 4:50 | Switch back to the deck, press **End** | Team slide | "We are Team 2. Thank you." |

`make reset` after the talk, not on stage.

## If something fails

- **Terminal prints `FEED STALLED`?** The backend stopped ingesting. Switch to
  the backup recording now; restart the backend after the talk.
- **Anything breaks on stage?** Do not debug live. Play the backup recording and
  keep talking over it; the clock does not stop.

- **No telemetry?** `make present-check` says why. `make sim-logs`; if the
  broker is down, `make demo` again.
- **Just the hero truck?** `python scripts/present.py --hero-only` runs only
  T102's refrigeration failure.
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

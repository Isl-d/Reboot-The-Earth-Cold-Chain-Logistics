#!/usr/bin/env python3
"""Drive the live demo: one hot afternoon in Doha, four trucks, one emergency.

    python scripts/present.py              # the full story (~1 min to set up)
    python scripts/present.py --hero-only  # only T102's refrigeration failure
    python scripts/present.py --check      # preflight only: is the live feed fresh?

The story, on a timeline from the moment you run it:

    +0s   T104 lettuce   TRAFFIC_DELAY           stuck in traffic, still cold: LOW
    +10s  T103 milk      DOOR_LEFT_OPEN          door left open at a drop-off
    +20s  T102 chicken   REFRIGERATION_FAILURE   the emergency (the demo's hero)
    +40s  T103 milk      NORMAL                  driver closes the door; it recovers
          T101 chicken   NORMAL throughout       the healthy reference truck

So the Command Center shows triage, not one red dot: a delay the system does
not panic about, a door incident that opened and resolved on its own, and one
truck that needs a decision now.

This script talks to the running backend through the same REST endpoints as
``make scenario``. It computes nothing: it triggers scenarios on a timeline and
prints the backend's own numbers as stage cues. Stdlib only, so it runs with
any Python 3.9+.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import sys
import time
import urllib.error
import urllib.request

STALE_S = 15.0          # a reading older than this means the live feed stopped
POLL_S = 3.0
MAX_FAILURES = 5        # consecutive failed polls before declaring the backend lost

# (seconds after start, truck, scenario, what to say / what it means)
STORY = [
    (0, "T104", "TRAFFIC_DELAY",
     "T104 (1,200 kg lettuce) is stuck in traffic. Still cold, so LOW: no false alarm."),
    (10, "T103", "DOOR_LEFT_OPEN",
     "T103 (800 kg milk): cargo door left open at a drop-off."),
    (20, "T102", "REFRIGERATION_FAILURE",
     "T102 (500 kg chicken): refrigeration fails in 38 C heat. This is the demo."),
    (40, "T103", "NORMAL",
     "T103: driver closes the door. Temperature recovers; the exposure stays on record."),
]
HERO_ONLY = [STORY[2]]
HERO_TRUCK, HERO_BATCH = "T102", "CHK-1029"


# ---------------------------------------------------------------- http
class Api:
    def __init__(self, base: str) -> None:
        self.base = base.rstrip("/")

    def call(self, method: str, path: str, body: dict | None = None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(self.base + path, data=data, method=method,
                                     headers={"content-type": "application/json"})
        with urllib.request.urlopen(req, timeout=8) as resp:
            raw = resp.read()
        return json.loads(raw) if raw else None

    def get(self, path: str):
        return self.call("GET", path)

    def post(self, path: str, body: dict | None = None):
        return self.call("POST", path, body or {})


# ---------------------------------------------------------------- helpers
def say(msg: str = "") -> None:
    print(msg, flush=True)


def age_s(stamp: str | None) -> float:
    if not stamp:
        return float("inf")
    ts = dt.datetime.fromisoformat(stamp.replace("Z", "+00:00"))
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    return (dt.datetime.now(dt.timezone.utc) - ts).total_seconds()


def trucks(api: Api) -> dict[str, dict]:
    return {t["id"]: t for t in api.get("/api/trucks")["trucks"]}


def open_incidents(api: Api) -> dict[tuple[str, str], str]:
    """(truck, incident type) -> severity, for every OPEN incident."""
    return {(i["truckId"], i["type"]): i["severity"]
            for i in api.get("/api/incidents?status=OPEN")}


def fleet_line(elapsed: float, fleet: dict[str, dict]) -> str:
    cells = []
    for tid in sorted(fleet):
        t = fleet[tid]
        flag = "!" if t.get("activeIncident") else " "
        cells.append(f"{tid} {t['temperatureC']:5.1f}C {t['riskLevel']:<8}{flag}")
    return f"  +{elapsed:4.0f}s  " + " | ".join(cells)


def die(msg: str) -> None:
    say()
    say(f"STOP: {msg}")
    sys.exit(1)


# ---------------------------------------------------------------- preflight
def preflight(api: Api) -> None:
    say("Preflight")
    try:
        health = api.get("/healthz")
    except (urllib.error.URLError, OSError) as exc:
        die(f"backend not reachable at {api.base} ({exc}).\n"
            "      Start it: `make demo`, or `make dev-backend` + `make dev-sim`.")
    say(f"  backend   ok (database={health.get('database')}, trucks={health.get('trucks')})")

    fleet = trucks(api)
    oldest = max(age_s(t.get("lastUpdated")) for t in fleet.values())
    if oldest > STALE_S:
        die(f"the live feed is stale: truck readings are up to {oldest:.0f}s old.\n"
            "      The backend is not ingesting telemetry. Restart the backend\n"
            "      (`docker compose restart backend` or re-run `make dev-backend`)\n"
            "      and make sure exactly ONE simulator is running.")
    say(f"  telemetry live (oldest truck reading {oldest:.0f}s ago)")

    # One simulator ticks every ~3 s. Two simulators interleave their readings,
    # so the same truck reports twice as often and its temperature flips
    # between two different stories. Sample the feed for a few seconds.
    seen: set[str] = set()
    end = time.time() + 9
    while time.time() < end:
        seen.add(trucks(api)["T101"].get("lastUpdated") or "")
        time.sleep(1)
    if len(seen) > 4:
        say(f"  WARNING  T101 reported {len(seen)} times in 9s. Two simulators are\n"
            "           probably running; stop one or the trucks will flicker.")
    else:
        say(f"  simulator ok ({len(seen)} readings from T101 in 9s)")


def reset(api: Api) -> None:
    say()
    say("Resetting every truck to NORMAL ...")
    api.post("/api/simulation/reset")
    for _ in range(20):
        time.sleep(1.5)
        fleet = trucks(api)
        fresh = all(age_s(t.get("lastUpdated")) < 5 for t in fleet.values())
        if fresh and not open_incidents(api):
            say("  fleet is clean: no open incidents")
            return
    say("  WARNING  fleet not fully clean after 30s; continuing anyway")


# ---------------------------------------------------------------- story
def ready_block(api: Api) -> None:
    """Print the backend's own numbers for the hero batch, as stage cues."""
    say()
    say("=" * 72)
    say(" READY. Switch to the dashboard (http://localhost:5173).")
    try:
        rec = api.get(f"/api/recommendations/{HERO_BATCH}").get("recommendation") or {}
        say(f"  Optimization  {rec.get('action')} -> {rec.get('destinationId')}, "
            f"ETA {rec.get('etaMinutes')} min, expected loss {rec.get('expectedLossPercent')}%")
        loss = api.get("/api/analytics/food-loss")
        hero = next((b for b in loss.get("batches", []) if b["batchId"] == HERO_BATCH), {})
        say(f"  Food loss     T102 saves {hero.get('foodSavedKg')} kg, "
            f"{hero.get('financialLossPrevented')} {loss.get('currency', 'QAR')} prevented")
        say(f"  Fleet         {loss.get('savedKg')} kg saved, "
            f"{loss.get('co2AvoidedKg')} kg CO2 avoided (all backend-computed)")
    except (urllib.error.URLError, OSError, AttributeError) as exc:
        say(f"  (numbers not available yet: {exc}; the dashboard will show them)")
    say("  Numbers keep moving while the truck warms; quote what is on screen.")
    say("=" * 72)
    say()


def run(api: Api, story: list[tuple]) -> None:
    start = time.time()
    pending = list(story)
    incidents = open_incidents(api)
    ready = False
    last_line = 0.0
    failures = 0

    say()
    say("Story running. Ctrl+C stops watching (the scenario keeps running).")
    while True:
        elapsed = time.time() - start
        # A busy backend (the dashboard polls hard) can answer one request
        # slowly; that is not an outage. Give up only after several in a row.
        try:
            ready, incidents, last_line = _tick(api, elapsed, pending, incidents,
                                                ready, last_line)
            failures = 0
        except (urllib.error.URLError, OSError) as exc:
            failures += 1
            if failures >= MAX_FAILURES:
                raise
            say(f"  +{elapsed:4.0f}s  backend slow ({exc}); retrying")
        time.sleep(POLL_S)


def _tick(api: Api, elapsed: float, pending: list[tuple],
          incidents: dict[tuple[str, str], str], ready: bool, last_line: float):
    """One poll: fire due story beats, report changes. Returns updated state."""
    while pending and elapsed >= pending[0][0]:
        _, truck_id, scenario, cue = pending[0]
        api.post("/api/simulation/scenario", {"truckId": truck_id, "scenario": scenario})
        pending.pop(0)      # only once the backend accepted it
        say(f"  +{elapsed:4.0f}s  >> {cue}")

    fleet = trucks(api)
    now_incidents = open_incidents(api)
    for key in sorted(now_incidents.keys() | incidents.keys()):
        tid, kind = key
        before, after = incidents.get(key), now_incidents.get(key)
        if before is None:
            say(f"  +{elapsed:4.0f}s  !! {tid} incident opened: {kind} ({after})")
        elif after is None:
            say(f"  +{elapsed:4.0f}s  ok {tid} incident closed: {kind}")
        elif before != after:
            say(f"  +{elapsed:4.0f}s  !! {tid} {kind} now {after}")
    incidents = now_incidents

    stale = max(age_s(t.get("lastUpdated")) for t in fleet.values())
    if stale > STALE_S:
        say(f"  +{elapsed:4.0f}s  FEED STALLED ({stale:.0f}s without data). "
            "On stage: play the backup recording.")

    # Every poll while setting up, every 15 s once ready.
    if not ready or time.time() - last_line >= 15:
        say(fleet_line(elapsed, fleet))
        last_line = time.time()

    hero = fleet.get(HERO_TRUCK, {})
    if not ready and not pending and hero.get("riskLevel") in {"HIGH", "CRITICAL"}:
        ready = True
        say(f"  +{elapsed:4.0f}s  T102 reached {hero['riskLevel']}. "
            f"Rehearsal: trigger at least {elapsed:.0f}s before the demo.")
        ready_block(api)

    return ready, incidents, last_line


def main() -> int:
    ap = argparse.ArgumentParser(description="Drive the live demo story")
    ap.add_argument("--api", default="http://localhost:8000", help="backend base URL")
    ap.add_argument("--hero-only", action="store_true", help="only T102's refrigeration failure")
    ap.add_argument("--check", action="store_true", help="preflight only, change nothing")
    ap.add_argument("--no-reset", action="store_true", help="do not reset the fleet first")
    args = ap.parse_args()

    api = Api(args.api)
    preflight(api)
    if args.check:
        say("\nPreflight passed.")
        return 0
    if not args.no_reset:
        reset(api)
    try:
        run(api, HERO_ONLY if args.hero_only else STORY)
    except KeyboardInterrupt:
        say("\nStopped watching. The scenario is still running; `make reset` after the talk.")
    except (urllib.error.URLError, OSError) as exc:
        die(f"lost the backend ({exc}). On stage: play the backup recording.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

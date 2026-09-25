#!/usr/bin/env python3
"""Run the whole pipeline on one host: no broker, no Postgres, no Redis.

    python scripts/dev_no_broker.py --ticks 8
    python scripts/dev_no_broker.py --scenario REFRIGERATION_FAILURE --truck T102

The simulator's physics is stepped in-process and every reading is pushed
through the *real* ingestion pipeline (``pipeline.handle``): validation,
normalization, derived values, risk, incidents, storage and WebSocket fan-out.
The app runs on a throwaway SQLite file with the in-process cache, so this is
the fastest way to watch data move end to end before wiring Docker.

This is a demo/inspection tool, not the production path: that is
``make demo`` (Mosquitto + TimescaleDB + Redis + backend + simulator).
"""
from __future__ import annotations

import argparse
import json
import os
import pathlib
import random
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "sensor-simulator"))


def configure_env(db_path: pathlib.Path) -> None:
    """Pin every dependency to a local, offline substitute *before* import."""
    os.environ["CC_DATABASE_URL"] = f"sqlite:///{db_path}"
    os.environ["CC_REDIS_URL"] = "redis://127.0.0.1:1/0"
    os.environ["CC_TIMESCALE_ENABLED"] = "false"
    os.environ["CC_MQTT_HOST"] = "127.0.0.1"
    os.environ["CC_MQTT_PORT"] = "1"
    os.environ["CC_INTELLIGENCE_ENABLED"] = os.environ.get("CC_INTELLIGENCE_ENABLED", "false")


def main() -> int:
    ap = argparse.ArgumentParser(description="Cold-chain pipeline, no broker/db/docker")
    ap.add_argument("--ticks", type=int, default=8, help="readings per truck")
    ap.add_argument("--interval", type=float, default=3.0, help="seconds between ticks")
    ap.add_argument("--truck", default="T102", help="truck the scenario applies to")
    ap.add_argument("--scenario", default="NORMAL", help="scenario for --truck")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--db", default=str(ROOT / "dev_coldchain.db"))
    ap.add_argument("--ai", action="store_true",
                    help="call the real OpenRouter LLM (needs OPENROUTERAPIKEY); "
                         "default is the offline heuristic")
    args = ap.parse_args()

    db_path = pathlib.Path(args.db)
    if db_path.exists():
        db_path.unlink()
    configure_env(db_path)

    from fastapi.testclient import TestClient

    import fleet
    from backend.ingest.consumer import pipeline
    from backend.intelligence import llm as llm_mod
    from backend.main import app
    from simulator import Truck

    if not args.ai:
        llm_mod.set_client(llm_mod.LLMClient(key=""))  # force the offline heuristic

    infos, _routes = fleet.load_trucks()
    rng = random.Random(args.seed)
    trucks = {info["id"]: Truck(info, rng) for info in infos}
    for truck in trucks.values():
        scenario = args.scenario if truck.info["id"] == args.truck else "NORMAL"
        truck.control({"scenario": scenario})

    print(f"pipeline on {db_path}  scenario={args.scenario} on {args.truck}  "
          f"{args.ticks} ticks x {args.interval:g}s")
    print("-" * 100)

    import datetime as dt

    # Real ticks are seconds apart; the demo runs instantly, so advance a
    # virtual clock to keep one stored reading per tick.
    base = dt.datetime.now(dt.timezone.utc) - dt.timedelta(seconds=args.ticks * args.interval)

    with TestClient(app) as client:
        for tick in range(args.ticks):
            stamp = (base + dt.timedelta(seconds=(tick + 1) * args.interval)).strftime(
                "%Y-%m-%dT%H:%M:%SZ"
            )
            cells = []
            state = {t["id"]: t for t in client.get("/api/trucks").json()["trucks"]}
            for truck in trucks.values():
                message = truck.step(args.interval)
                message["timestamp"] = stamp
                pipeline.handle(message)
                current = state.get(truck.info["id"], {})
                cells.append(
                    f"{truck.info['id']} {message['temperatureC']:>5.1f}C "
                    f"{current.get('riskLevel') or '-':<8} "
                    f"{current.get('riskScore') if current.get('riskScore') is not None else '-':>3}"
                )
            print(f"tick {tick + 1:>2}  " + " | ".join(cells))

        # A deliberately broken reading must be rejected and logged, not stored.
        before = client.get("/api/trucks/T102/telemetry").json()
        pipeline.handle({
            "deviceId": "TRUCK-T102", "timestamp": "2026-09-24T16:20:00Z",
            "temperatureC": 7.2, "humidityPct": 999, "latitude": 25.2854,
            "longitude": 51.531, "speedKmh": 42, "gForce": 0.2,
            "doorOpen": False, "refrigerationOn": True,
        })
        after = client.get("/api/trucks/T102/telemetry").json()
        print("-" * 100)
        print(f"bad reading rejected: stored {len(before)} -> {len(after)} readings")

        print("\nGET /api/trucks")
        for truck in client.get("/api/trucks").json()["trucks"]:
            print("  " + json.dumps(truck))

        print(f"\nGET /api/internal/context/{args.truck}  (the Person 4 hand-off)")
        context = client.get(f"/api/internal/context/{args.truck}").json()
        print("  truck    ", json.dumps(context["truck"]))
        print("  batch    ", json.dumps(context["batch"]))
        print(f"  history   {len(context['recentTelemetry'])} readings")
        print(f"  warehouses {[w['id'] for w in context['candidateWarehouses']]}")

        open_incidents = client.get("/api/incidents", params={"status": "OPEN"}).json()
        print(f"\nGET /api/incidents?status=OPEN  -> {len(open_incidents)}")
        for incident in open_incidents:
            print(f"  {incident['severity']:<8} {incident['truckId']} "
                  f"{incident['type']}: {incident['message']}")

        batch_id = trucks[args.truck].info["batch_id"]
        prediction = client.get(f"/api/predictions/{batch_id}").json()
        print(f"\nGET /api/predictions/{batch_id}  (Person 4 intelligence, "
              f"{'LLM' if args.ai else 'offline heuristic'})")
        print(f"  thermal exposure   {prediction['thermalExposure']} C*min "
              f"over {prediction['exposureMinutes']} min")
        print(f"  deterioration      {prediction['deteriorationFraction']} "
              f"-> {prediction['remainingShelfLifeHours']} h shelf life left")
        print(f"  spoilage           {prediction['spoilageProbability']} "
              f"(confidence {prediction['confidence']}, {prediction['spoilageSource']})")
        print(f"  risk               {prediction['riskScore']} {prediction['riskLevel']}")
        print(f"  anomaly            {prediction['anomaly']} {prediction['anomalyType']}")
        recommendation = prediction["recommendation"]
        print(f"  action             {recommendation['action']}"
              + (f" -> {recommendation['destinationId']} "
                 f"(ETA {recommendation['etaMinutes']} min)" if recommendation['destinationId'] else ""))
        print(f"  food saved         {prediction['foodLoss']['foodSavedKg']} kg "
              f"(financial loss prevented {prediction['foodLoss']['financialLossPrevented']})")

    if db_path.exists():
        db_path.unlink()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
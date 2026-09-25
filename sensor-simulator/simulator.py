"""Sensor simulator: publishes realistic cold-chain telemetry every 2-5 s.

    python sensor-simulator/simulator.py --broker localhost --interval 3
    python sensor-simulator/simulator.py --dry-run --ticks 5

Telemetry ->  coldchain/trucks/{truckId}/telemetry  (the schema Person 3 owns)
Events    ->  coldchain/trucks/{truckId}/events
Control   <-  coldchain/control/{truckId}  (or .../all)

Control messages:
    {"scenario": "REFRIGERATION_FAILURE", "speedMultiplier": 10}
    {"scenario": "NORMAL"}
    {"paused": true|false}
    {"reset": true}
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fleet import MAP_SPEED, load_trucks, point_at  # noqa: E402
import scenarios  # noqa: E402

AMBIENT = float(os.environ.get("CC_AMBIENT_TEMP_C", "38"))


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


class Truck:
    def __init__(self, info: dict, rng: random.Random) -> None:
        self.info = info
        self.rng = rng
        self.reset()

    # ------------------------------------------------------------------ state
    def reset(self) -> None:
        self.scenario = "NORMAL"
        self.speed_multiplier = 1.0
        self.paused = False
        self.frac = self.info["start_frac"]
        self.air = self.info["ideal"] + 0.5 + self.rng.uniform(-0.4, 0.4)
        self.humidity = 88.0
        self.clock = 0.0
        self.shock_until = 0.0
        self._last_shock = 0.0
        self.events: list[dict] = []
        self._door = False
        self._refrigeration = True

    # ---------------------------------------------------------------- events
    def _event(self, etype: str, detail: str = "") -> None:
        self.events.append({
            "deviceId": self.info["device_id"],
            "truckId": self.info["id"],
            "timestamp": _now(),
            "type": etype,
            "detail": detail,
            "value": None,
        })

    def drain_events(self) -> list[dict]:
        events, self.events = self.events, []
        return events

    # --------------------------------------------------------------- physics
    def step(self, dt_s: float) -> dict:
        spec = scenarios.get(self.scenario)
        self.clock += dt_s

        # scenario transitions that need a one-off effect
        if spec["shock"] and self.clock - self._last_shock > 8.0:
            self.shock_until = self.clock + 2.5
            self._last_shock = self.clock
            self._event("SHOCK", "handling shock above threshold")

        target = scenarios.resolve_target(self.info, spec, AMBIENT)
        rate = spec["rate"]
        self.air += (target - self.air) * min(1.0, rate * dt_s) + self.rng.gauss(0, 0.05)

        door_open = bool(spec["door"])
        refrigeration = bool(spec["refrigeration"])
        if door_open != self._door:
            self._event("DOOR_OPENED" if door_open else "DOOR_CLOSED", self.scenario)
            self._door = door_open
        if refrigeration != self._refrigeration:
            self._event("REFRIGERATION_ON" if refrigeration else "REFRIGERATION_OFF", self.scenario)
            self._refrigeration = refrigeration

        if door_open:
            self.humidity = max(55.0, self.humidity - 0.6 * dt_s)
        else:
            self.humidity = min(92.0, self.humidity + 0.2 * dt_s)

        # The reported speed must stay physically plausible (the validator caps
        # it at 300 km/h), while the speed multiplier makes the truck cover its
        # route faster. So: report a capped speed, advance with the multiplied one.
        base_speed = 42.0 * spec["speed_factor"] * (0.85 + 0.3 * self.rng.random())
        display_speed = min(base_speed, 120.0)
        advance_speed = base_speed * self.speed_multiplier

        # advance along the route; traffic slows the advance as well
        route_s = max(self.info["route"]["duration_min"], 1.0) * 60.0
        self.frac = (self.frac + (advance_speed / 60.0) * MAP_SPEED * dt_s / route_s) % 1.0
        lat, lon = point_at(self.info["route"], self.frac)

        g = abs(self.rng.gauss(0, 0.08)) + 0.02
        if self.clock < self.shock_until:
            g += 2.5

        return {
            "deviceId": self.info["device_id"],
            "truckId": self.info["id"],
            "timestamp": _now(),
            "temperatureC": round(self.air, 2),
            "humidityPct": round(self.humidity, 1),
            "latitude": round(lat, 5),
            "longitude": round(lon, 5),
            "speedKmh": round(display_speed, 1),
            "gForce": round(g, 3),
            "doorOpen": door_open,
            "refrigerationOn": bool(spec["refrigeration"]),
        }

    # --------------------------------------------------------------- control
    def control(self, msg: dict) -> None:
        if msg.get("reset"):
            self.reset()
            return
        if "scenario" in msg and scenarios.is_valid(msg["scenario"]):
            self.scenario = msg["scenario"].upper()
            self._event("SCENARIO_CHANGED", self.scenario)
        if "speedMultiplier" in msg:
            try:
                self.speed_multiplier = max(0.0, float(msg["speedMultiplier"]))
            except (TypeError, ValueError):
                pass
        if "paused" in msg:
            self.paused = bool(msg["paused"])


def main() -> None:
    ap = argparse.ArgumentParser(description="Cold-chain sensor simulator")
    ap.add_argument("--broker", default="localhost")
    ap.add_argument("--port", type=int, default=1883)
    ap.add_argument("--interval", type=float, default=3.0, help="seconds between readings (2-5)")
    ap.add_argument("--seed", type=int, default=7, help="fixed seed so every demo run is identical")
    ap.add_argument("--dry-run", action="store_true", help="print messages instead of publishing")
    ap.add_argument("--ticks", type=int, default=0, help="stop after N ticks (0 = forever)")
    args = ap.parse_args()

    rng = random.Random(args.seed)
    infos, _routes = load_trucks()
    trucks = {i["id"]: Truck(i, rng) for i in infos}

    client = None
    if not args.dry_run:
        import paho.mqtt.client as mqtt

        def _publish_events(target_trucks):
            for t in target_trucks:
                for ev in t.drain_events():
                    client.publish(f"coldchain/trucks/{t.info['id']}/events", json.dumps(ev))

        def on_message(_c, _u, m):
            try:
                msg = json.loads(m.payload or b"{}")
            except json.JSONDecodeError:
                return
            target = m.topic.rsplit("/", 1)[-1]
            if target == "all":
                for t in trucks.values():
                    t.control(msg)
                _publish_events(trucks.values())
                print(f"control all: {msg}", flush=True)
            elif target in trucks:
                trucks[target].control(msg)
                _publish_events([trucks[target]])
                print(f"control {target}: {msg}", flush=True)

        client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="coldchain-simulator")
        client.on_message = on_message
        client.connect(args.broker, args.port)
        client.subscribe("coldchain/control/+")
        client.loop_start()
        print(f"simulating {len(trucks)} trucks -> {args.broker}:{args.port} "
              f"every {args.interval}s", flush=True)

    tick, last = 0, time.time()
    try:
        while True:
            now = time.time()
            dt_s, last = now - last, now
            for t in trucks.values():
                if t.paused:
                    continue
                msg = t.step(dt_s if tick else args.interval)
                topic = f"coldchain/trucks/{t.info['id']}/telemetry"
                if client:
                    client.publish(topic, json.dumps(msg))
                else:
                    print(topic, json.dumps(msg), flush=True)
                for ev in t.drain_events():
                    ev_topic = f"coldchain/trucks/{t.info['id']}/events"
                    if client:
                        client.publish(ev_topic, json.dumps(ev))
                    else:
                        print(ev_topic, json.dumps(ev), flush=True)
            tick += 1
            if args.ticks and tick >= args.ticks:
                break
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        if client:
            client.loop_stop()
            client.disconnect()


if __name__ == "__main__":
    main()
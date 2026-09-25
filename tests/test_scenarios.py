"""Scenario engine and the simulator's physical behaviour."""
from __future__ import annotations

import random

import fleet
import scenarios
from simulator import Truck

INFO = fleet.load_trucks()[0][0]  # T101, Fresh Chicken, safe 0..4 C


def _truck(scenario: str, seed: int = 1) -> Truck:
    t = Truck(INFO, random.Random(seed))
    t.control({"scenario": scenario})
    return t


def _run(t: Truck, steps: int, dt_s: float = 3.0) -> list[dict]:
    return [t.step(dt_s) for _ in range(steps)]


def test_all_named_scenarios_exist():
    for name in ["NORMAL", "TEMPERATURE_EXCURSION", "DOOR_LEFT_OPEN",
                 "REFRIGERATION_FAILURE", "TRAFFIC_DELAY", "COMBINED_FAILURE",
                 "G_FORCE_EVENT"]:
        assert scenarios.is_valid(name)


def test_unknown_scenario_falls_back_to_normal():
    assert scenarios.get("NONSENSE") is scenarios.get("NORMAL")


def test_normal_stays_near_setpoint():
    t = _truck("NORMAL")
    temps = [m["temperatureC"] for m in _run(t, 40)]
    assert all(INFO["safe_min"] - 0.5 <= x <= INFO["safe_max"] + 0.5 for x in temps)
    assert all(m["refrigerationOn"] for m in _run(t, 5))


def test_door_left_open_wets_and_warms():
    t = _truck("DOOR_LEFT_OPEN")
    msgs = _run(t, 5)
    assert all(m["doorOpen"] for m in msgs)
    assert msgs[-1]["humidityPct"] < 88.0  # humidity falls while open


def test_refrigeration_failure_warms_faster_than_door():
    fridge = _truck("REFRIGERATION_FAILURE")
    door = _truck("DOOR_LEFT_OPEN")
    fridge_temp = _run(fridge, 60)[-1]["temperatureC"]
    door_temp = _run(door, 60)[-1]["temperatureC"]
    assert fridge_temp > door_temp
    assert fridge.scenario == "REFRIGERATION_FAILURE"


def test_traffic_delay_collapses_speed():
    normal = _truck("NORMAL")
    traffic = _truck("TRAFFIC_DELAY")
    normal_speed = _run(normal, 3)[-1]["speedKmh"]
    traffic_speed = _run(traffic, 3)[-1]["speedKmh"]
    assert traffic_speed < 10 < normal_speed


def test_gforce_event_injects_a_shock():
    t = _truck("G_FORCE_EVENT")
    peaks = [m["gForce"] for m in _run(t, 6)]
    assert max(peaks) > 1.0  # above the default shock threshold
    assert min(peaks) < 1.0  # baseline readings stay calm


def test_excursion_target_is_product_aware():
    spec = scenarios.get("TEMPERATURE_EXCURSION")
    assert scenarios.resolve_target(INFO, spec, 38.0) == INFO["safe_max"] + 3.0


def test_pause_and_reset():
    t = _truck("REFRIGERATION_FAILURE")
    _run(t, 20)
    warmed = t.air
    t.control({"reset": True})
    assert t.scenario == "NORMAL"
    assert t.clock == 0.0
    assert abs(t.air - INFO["ideal"]) < 1.0
    assert t.air != warmed
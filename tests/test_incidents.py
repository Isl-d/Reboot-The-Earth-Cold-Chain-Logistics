"""Deterministic incident rules (no DB; reconciliation is tested via the API)."""
from __future__ import annotations

from backend.ingest import incidents


def _reading(**over):
    base = {
        "temperature_c": 3.0,
        "speed_kmh": 42.0,
        "g_force": 0.2,
        "door_open": False,
        "refrigeration_on": True,
    }
    base.update(over)
    return base


def test_normal_reading_opens_nothing():
    assert incidents.desired(_reading(), {}, 4.0) == {}


def test_temperature_excursion_severity_scales():
    assert incidents.desired(_reading(temperature_c=4.5), {}, 4.0)["TEMPERATURE_EXCURSION"]["severity"] == "MEDIUM"
    assert incidents.desired(_reading(temperature_c=6.5), {}, 4.0)["TEMPERATURE_EXCURSION"]["severity"] == "HIGH"
    assert incidents.desired(_reading(temperature_c=9.0), {}, 4.0)["TEMPERATURE_EXCURSION"]["severity"] == "CRITICAL"


def test_refrigeration_failure():
    out = incidents.desired(_reading(refrigeration_on=False), {}, 4.0)
    assert out["REFRIGERATION_FAILURE"]["severity"] == "HIGH"


def test_door_incident_needs_duration():
    assert "DOOR_LEFT_OPEN" not in incidents.desired(_reading(door_open=True), {"door_duration_s": 5}, 4.0)
    assert "DOOR_LEFT_OPEN" in incidents.desired(_reading(door_open=True), {"door_duration_s": 20}, 4.0)


def test_gforce_severity():
    assert incidents.desired(_reading(g_force=1.2), {}, 4.0)["G_FORCE_EVENT"]["severity"] == "MEDIUM"
    assert incidents.desired(_reading(g_force=2.5), {}, 4.0)["G_FORCE_EVENT"]["severity"] == "HIGH"


def test_traffic_delay_only_when_creeping():
    assert "TRAFFIC_DELAY" in incidents.desired(_reading(speed_kmh=5.0), {}, 4.0)
    assert "TRAFFIC_DELAY" not in incidents.desired(_reading(speed_kmh=0.0), {}, 4.0)
    assert "TRAFFIC_DELAY" not in incidents.desired(_reading(speed_kmh=42.0), {}, 4.0)
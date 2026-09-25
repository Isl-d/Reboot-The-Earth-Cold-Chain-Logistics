"""The scenario engine.

Each scenario is a small set of physical parameters. A ``target`` of
``"setpoint"``, ``"ambient"`` or ``"excursion"`` is resolved per truck against
that truck's own safe range, so the same scenario behaves correctly for
chicken, milk or lettuce.

    NORMAL                 oscillate around the safe setpoint
    TEMPERATURE_EXCURSION  drift slowly above the safe maximum
    DOOR_LEFT_OPEN         door open, warming gradually
    REFRIGERATION_FAILURE  cooling off, warming fast
    TRAFFIC_DELAY          speed collapses, ETA grows
    COMBINED_FAILURE       refrigeration failure + traffic delay
    G_FORCE_EVENT          a handling shock (bonus scenario)
"""
from __future__ import annotations

SCENARIOS: dict[str, dict] = {
    "NORMAL": {
        "target": "setpoint", "rate": 0.06, "door": False,
        "refrigeration": True, "speed_factor": 1.0, "shock": False,
        "description": "Temperature oscillates around the safe range.",
    },
    "TEMPERATURE_EXCURSION": {
        "target": "excursion", "rate": 0.02, "door": False,
        "refrigeration": True, "speed_factor": 1.0, "shock": False,
        "description": "Temperature slowly exceeds the safe maximum.",
    },
    "DOOR_LEFT_OPEN": {
        "target": "ambient", "rate": 0.02, "door": True,
        "refrigeration": True, "speed_factor": 1.0, "shock": False,
        "description": "Door open; temperature rises gradually.",
    },
    "REFRIGERATION_FAILURE": {
        "target": "ambient", "rate": 0.04, "door": False,
        "refrigeration": False, "speed_factor": 1.0, "shock": False,
        "description": "Cooling stops; temperature rises faster.",
    },
    "TRAFFIC_DELAY": {
        "target": "setpoint", "rate": 0.06, "door": False,
        "refrigeration": True, "speed_factor": 0.15, "shock": False,
        "description": "Speed decreases and ETA increases.",
    },
    "COMBINED_FAILURE": {
        "target": "ambient", "rate": 0.04, "door": False,
        "refrigeration": False, "speed_factor": 0.15, "shock": False,
        "description": "Temperature and transport problems combined.",
    },
    "G_FORCE_EVENT": {
        "target": "setpoint", "rate": 0.06, "door": False,
        "refrigeration": True, "speed_factor": 1.0, "shock": True,
        "description": "A handling shock is injected for a few seconds.",
    },
}

DEFAULT = "NORMAL"


def get(name: str) -> dict:
    return SCENARIOS.get((name or DEFAULT).upper(), SCENARIOS[DEFAULT])


def is_valid(name: str) -> bool:
    return (name or "").upper() in SCENARIOS


def resolve_target(truck, spec: dict, ambient: float) -> float:
    target = spec["target"]
    if target == "setpoint":
        return truck["ideal"] + 0.5
    if target == "ambient":
        return ambient
    if target == "excursion":
        return truck["safe_max"] + 3.0
    return float(target)
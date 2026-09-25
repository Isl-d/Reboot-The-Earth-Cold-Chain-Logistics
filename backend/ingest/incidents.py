"""Incident rules — deterministic, no ML.

Which incident types *should* be open for the current reading, and how
severe. Reconciliation against the open rows already in the database happens
in the consumer, so this module stays pure and easy to test.
"""
from __future__ import annotations

from ..config import settings

TEMPERATURE_EXCURSION = "TEMPERATURE_EXCURSION"
REFRIGERATION_FAILURE = "REFRIGERATION_FAILURE"
DOOR_LEFT_OPEN = "DOOR_LEFT_OPEN"
G_FORCE_EVENT = "G_FORCE_EVENT"
TRAFFIC_DELAY = "TRAFFIC_DELAY"

MESSAGES = {
    TEMPERATURE_EXCURSION: "Temperature is above the batch safe maximum.",
    REFRIGERATION_FAILURE: "Refrigeration is off while the truck is loaded.",
    DOOR_LEFT_OPEN: "Cargo door has been open longer than expected.",
    G_FORCE_EVENT: "A shock above the handling limit was detected.",
    TRAFFIC_DELAY: "Speed has dropped far below the route average.",
}


def desired(reading: dict, derived: dict, safe_max_c: float | None) -> dict[str, dict]:
    """Map of incident type -> {severity, message} that should be open now."""
    out: dict[str, dict] = {}
    temp = reading.get("temperature_c")
    speed = reading.get("speed_kmh") or 0.0

    if temp is not None and safe_max_c is not None and temp > safe_max_c:
        dev = temp - safe_max_c
        out[TEMPERATURE_EXCURSION] = {
            "severity": "CRITICAL" if dev >= 4 else ("HIGH" if dev >= 2 else "MEDIUM"),
            "message": MESSAGES[TEMPERATURE_EXCURSION],
        }
    if reading.get("refrigeration_on") is False:
        out[REFRIGERATION_FAILURE] = {"severity": "HIGH", "message": MESSAGES[REFRIGERATION_FAILURE]}
    if reading.get("door_open") and (derived.get("door_duration_s") or 0) >= settings.door_open_incident_s:
        out[DOOR_LEFT_OPEN] = {"severity": "MEDIUM", "message": MESSAGES[DOOR_LEFT_OPEN]}
    if (reading.get("g_force") or 0) >= settings.gforce_shock_threshold:
        hard = (reading.get("g_force") or 0) >= settings.gforce_hard_shock
        out[G_FORCE_EVENT] = {
            "severity": "HIGH" if hard else "MEDIUM",
            "message": MESSAGES[G_FORCE_EVENT],
        }
    if 0 < speed < settings.traffic_speed_threshold:
        out[TRAFFIC_DELAY] = {"severity": "LOW", "message": MESSAGES[TRAFFIC_DELAY]}
    return out
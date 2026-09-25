"""Baseline risk score — owned by Person 3 only until Person 4's engine overrides it.

Deterministic, documented, and deliberately simple: the live map and the
WebSocket need a riskScore/riskLevel on every reading, but the real
deterioration model belongs to Person 4. A prediction pushed by Person 4
(see ``routers/internal.py``) replaces this value everywhere it is read.

Risk is the maximum of independent factors, so any single serious problem
(compressor off, hard shock, sustained excursion) is visible immediately.
"""
from __future__ import annotations

from .config import settings

# Temperature above the safe maximum that counts as fully out of specification.
TEMP_DEVIATION_FULL_C = 6.0
# Seconds above the threshold that count as a full excursion.
TIME_ABOVE_FULL_S = 120.0
# Seconds with the door open that count as a full door incident.
DOOR_FULL_S = 60.0


def risk_level(score: float) -> str:
    if score < settings.risk_low_max:
        return "LOW"
    if score < settings.risk_medium_max:
        return "MEDIUM"
    if score < settings.risk_high_max:
        return "HIGH"
    return "CRITICAL"


def baseline_risk(reading: dict, derived: dict, safe_max_c: float | None) -> dict:
    temp = reading.get("temperature_c")
    speed = reading.get("speed_kmh") or 0.0
    g = reading.get("g_force") or 0.0
    door_open = bool(reading.get("door_open"))
    refrig_on = reading.get("refrigeration_on", True)

    factors: dict[str, float] = {}

    if temp is not None and safe_max_c is not None:
        dev = max(0.0, temp - safe_max_c)
        factors["temperature_excursion"] = min(1.0, dev / TEMP_DEVIATION_FULL_C) * 100
    above = derived.get("time_above_threshold_s") or 0.0
    if above > 0:
        factors["time_above_threshold"] = min(1.0, above / TIME_ABOVE_FULL_S) * 100
    if door_open:
        factors["door_open"] = 60.0
    door_s = derived.get("door_duration_s") or 0.0
    if door_s > 0:
        factors["door_duration"] = min(1.0, door_s / DOOR_FULL_S) * 100
    if refrig_on is False:
        factors["refrigeration_off"] = 80.0
    if g > settings.gforce_shock_threshold:
        span = max(1e-6, settings.gforce_hard_shock - settings.gforce_shock_threshold)
        factors["g_force_shock"] = min(1.0, (g - settings.gforce_shock_threshold) / span) * 100
    if 0 < speed < settings.traffic_speed_threshold:
        factors["traffic_delay"] = 40.0

    score = round(max(factors.values())) if factors else 0
    return {"riskScore": score, "riskLevel": risk_level(score),
            "factors": {k: round(v, 1) for k, v in factors.items()}}
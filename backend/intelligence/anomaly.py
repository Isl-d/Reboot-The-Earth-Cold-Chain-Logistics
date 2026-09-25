"""Anomaly detection (Person 4 §5) — statistical, deterministic, no ML.

A rolling z-score over the recent window flags an unusual temperature move;
simple domain rules flag a cooling failure, an abnormal door pattern, a GPS
speed collapse and a handling shock. Returns the single highest-scoring
anomaly, plus every candidate so the explainer can mention all of them.
"""
from __future__ import annotations

import math

from ..config import settings
from .features import _get


def _series(telemetry: list[dict], *names) -> list[float]:
    out: list[float] = []
    for reading in telemetry:
        value = _get(reading, *names)
        if value is not None:
            try:
                out.append(float(value))
            except (TypeError, ValueError):
                pass
    return out


def _zscore(values: list[float]) -> float | None:
    if len(values) < settings.anomaly_min_samples:
        return None
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    std = math.sqrt(variance)
    if std < 1e-6:
        return 0.0
    return (values[-1] - mean) / std


def detect(telemetry: list[dict], features: dict, batch: dict | None) -> dict:
    batch = batch or {}
    safe_max = float(batch.get("safeMaxTempC", batch.get("safe_max_temp_c", 4.0)))
    candidates: list[dict] = []

    temps = _series(telemetry, "temperatureC", "temperature_c", "temperature")
    z = _zscore(temps)
    if z is not None and abs(z) > settings.anomaly_z_threshold:
        candidates.append({
            "type": "TEMPERATURE_RISE" if z > 0 else "TEMPERATURE_DROP",
            "score": min(1.0, abs(z) / (2.0 * settings.anomaly_z_threshold)),
            "detail": f"latest reading is {z:+.1f}σ from the window mean",
        })

    if telemetry:
        last = telemetry[-1]
        if _get(last, "refrigerationOn", "refrigeration_on") is False:
            temp = _get(last, "temperatureC", "temperature_c", "temperature")
            score = 0.9 if temp is not None and float(temp) > safe_max else 0.6
            candidates.append({
                "type": "REFRIGERATION_BEHAVIOR",
                "score": score,
                "detail": "refrigeration is off while loaded",
            })
        if _get(last, "doorOpen", "door_open"):
            door_s = features.get("doorOpenSeconds") or 0.0
            if door_s >= settings.door_open_incident_s:
                candidates.append({
                    "type": "ABNORMAL_DOOR_PATTERN",
                    "score": min(1.0, door_s / (4.0 * settings.door_open_incident_s)),
                    "detail": f"door has been open for {door_s:.0f}s",
                })

    speeds = _series(telemetry, "speedKmh", "speed_kmh", "speed")
    if len(speeds) >= settings.anomaly_min_samples:
        mean_speed = sum(speeds) / len(speeds)
        if mean_speed > settings.traffic_speed_threshold and speeds[-1] < mean_speed * 0.25:
            candidates.append({
                "type": "GPS_BEHAVIOR",
                "score": 0.5,
                "detail": f"speed fell from {mean_speed:.0f} to {speeds[-1]:.0f} km/h",
            })

    gforces = _series(telemetry, "gForce", "g_force")
    hard = max(gforces, default=0.0)
    if hard >= settings.gforce_shock_threshold:
        candidates.append({
            "type": "G_FORCE_EVENT",
            "score": min(1.0, hard / max(settings.gforce_hard_shock, 1e-6)),
            "detail": f"peak shock {hard:.2f}g",
        })

    if not candidates:
        return {"anomaly": False, "type": None, "score": 0.0, "candidates": []}

    best = max(candidates, key=lambda c: c["score"])
    return {
        "anomaly": True,
        "type": best["type"],
        "score": round(best["score"], 3),
        "detail": best["detail"],
        "candidates": candidates,
    }
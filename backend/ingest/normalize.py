"""Normalization: one canonical reading, whatever the publisher sent.

Output keys are snake_case and match the ``sensor_readings`` columns; the
API layer turns them back into the camelCase wire contract.
"""
from __future__ import annotations

import datetime as dt

from ..schemas import TelemetryIn


def normalize(model: TelemetryIn, truck_id: str) -> dict:
    ts = model.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=dt.timezone.utc)
    ts = ts.astimezone(dt.timezone.utc)
    return {
        "device_id": model.deviceId,
        "truck_id": truck_id,
        "timestamp": ts,
        "temperature_c": float(model.temperatureC),
        "humidity_pct": float(model.humidityPct),
        "latitude": float(model.latitude),
        "longitude": float(model.longitude),
        "speed_kmh": float(model.speedKmh),
        "g_force": float(model.gForce),
        "door_open": bool(model.doorOpen),
        "refrigeration_on": bool(model.refrigerationOn),
        "src": "sim",
    }


def to_wire(reading: dict) -> dict:
    """Normalized reading -> camelCase wire payload (API and WebSocket)."""
    ts = reading["timestamp"]
    if isinstance(ts, dt.datetime):
        ts = ts.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    return {
        "truckId": reading["truck_id"],
        "timestamp": ts,
        "temperatureC": reading["temperature_c"],
        "humidityPct": reading["humidity_pct"],
        "latitude": reading["latitude"],
        "longitude": reading["longitude"],
        "speedKmh": reading["speed_kmh"],
        "gForce": reading["g_force"],
        "doorOpen": reading["door_open"],
        "refrigerationOn": reading["refrigeration_on"],
    }
"""Normalization to canonical snake_case and back to the camelCase wire."""
from __future__ import annotations

import datetime as dt

from backend.ingest.normalize import normalize, to_wire
from backend.schemas import TelemetryIn


def _model(**overrides) -> TelemetryIn:
    raw = {
        "deviceId": "TRUCK-T102",
        "timestamp": "2026-09-24T16:20:00+04:00",
        "temperatureC": 7.2,
        "humidityPct": 74,
        "latitude": 25.2854,
        "longitude": 51.531,
        "speedKmh": 42,
        "gForce": 0.2,
        "doorOpen": False,
        "refrigerationOn": True,
    }
    raw.update(overrides)
    return TelemetryIn.model_validate(raw)


def test_normalize_converts_to_utc():
    reading = normalize(_model(), "T102")
    assert reading["timestamp"].tzinfo is not None
    assert reading["timestamp"].utcoffset() == dt.timedelta(0)
    assert reading["timestamp"] == dt.datetime(2026, 9, 24, 12, 20, tzinfo=dt.timezone.utc)
    assert reading["truck_id"] == "T102"
    assert reading["device_id"] == "TRUCK-T102"


def test_normalize_treats_naive_as_utc():
    reading = normalize(_model(timestamp="2026-09-24T16:20:00"), "T102")
    assert reading["timestamp"] == dt.datetime(2026, 9, 24, 16, 20, tzinfo=dt.timezone.utc)


def test_to_wire_roundtrip_shape():
    wire = to_wire(normalize(_model(), "T102"))
    assert wire == {
        "truckId": "T102",
        "timestamp": "2026-09-24T12:20:00Z",
        "temperatureC": 7.2,
        "humidityPct": 74.0,
        "latitude": 25.2854,
        "longitude": 51.531,
        "speedKmh": 42.0,
        "gForce": 0.2,
        "doorOpen": False,
        "refrigerationOn": True,
    }
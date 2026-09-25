"""Validation: known-good passes, every bad reading is rejected with a reason."""
from __future__ import annotations

import datetime as dt

from backend.ingest.validate import validate

KNOWN = {"TRUCK-T102", "TRUCK-T103"}


def payload(**overrides) -> dict:
    base = {
        "deviceId": "TRUCK-T102",
        "truckId": "T102",
        "timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": 3.5,
        "humidityPct": 74,
        "latitude": 25.2854,
        "longitude": 51.531,
        "speedKmh": 42,
        "gForce": 0.2,
        "doorOpen": False,
        "refrigerationOn": True,
    }
    base.update(overrides)
    return base


def _reasons(raw: dict) -> list[str]:
    model, reasons = validate(raw, KNOWN)
    assert model is None
    return reasons


def test_valid_payload_accepted():
    model, reasons = validate(payload(), KNOWN)
    assert reasons == []
    assert model is not None
    assert model.temperatureC == 3.5


def test_short_keys_are_accepted():
    """The brief's temperature/humidity/lat/lon spelling also validates."""
    raw = {
        "deviceId": "TRUCK-T103",
        "timestamp": dt.datetime.now(dt.timezone.utc).isoformat(),
        "temperature": 2.9,
        "humidity": 70,
        "lat": 25.2,
        "lon": 51.5,
        "speed": 41,
        "gForce": 0.1,
        "doorOpen": False,
        "refrigerationOn": True,
    }
    model, reasons = validate(raw, KNOWN)
    assert reasons == []
    assert model.temperatureC == 2.9
    assert model.latitude == 25.2


def test_unknown_device_rejected():
    reasons = _reasons(payload(deviceId="TRUCK-NOPE"))
    assert any("unknown device" in r for r in reasons)


def test_implausible_temperature_rejected():
    reasons = _reasons(payload(temperatureC=200))
    assert any("temperatureC" in r for r in reasons)


def test_humidity_out_of_range_rejected():
    assert _reasons(payload(humidityPct=150))
    assert _reasons(payload(humidityPct=-1))


def test_gps_out_of_range_rejected():
    assert _reasons(payload(latitude=123))
    assert _reasons(payload(longitude=999))


def test_speed_negative_rejected():
    assert _reasons(payload(speedKmh=-5))


def test_gforce_out_of_range_rejected():
    assert _reasons(payload(gForce=99))


def test_naive_timestamp_rejected():
    reasons = _reasons(payload(timestamp="2026-09-24T16:20:00"))
    assert any("timezone" in r for r in reasons)


def test_future_timestamp_rejected():
    future = dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=2)
    reasons = _reasons(payload(timestamp=future.isoformat()))
    assert any("future" in r for r in reasons)


def test_ancient_timestamp_rejected():
    old = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=30)
    reasons = _reasons(payload(timestamp=old.isoformat()))
    assert any("past" in r for r in reasons)


def test_missing_field_rejected():
    raw = payload()
    del raw["temperatureC"]
    assert _reasons(raw)
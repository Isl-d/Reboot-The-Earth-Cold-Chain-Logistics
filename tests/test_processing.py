"""Derived values: distance, deviation, time above threshold, door duration, ETA."""
from __future__ import annotations

import datetime as dt

from backend.geo import haversine_km
from backend.processing import tracker


def _reading(ts, lat, lon, temp=3.0, speed=42.0, door=False):
    return {
        "truck_id": "T-TEST",
        "timestamp": ts,
        "temperature_c": temp,
        "humidity_pct": 74.0,
        "latitude": lat,
        "longitude": lon,
        "speed_kmh": speed,
        "g_force": 0.2,
        "door_open": door,
        "refrigeration_on": True,
    }


def setup_function(_fn):
    tracker.reset()


def test_haversine_against_a_known_offset():
    # ~0.001 degrees of latitude is ~111 m
    km = haversine_km(25.2854, 51.531, 25.2864, 51.531)
    assert 0.10 < km < 0.12


def test_first_reading_has_no_interval():
    out = tracker.update(_reading(dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc),
                                  25.28, 51.53), 4.0, 32.5)
    assert out["interval_s"] == 0.0
    assert out["distance_km"] == 0.0
    assert out["readings"] == 1


def test_distance_deviation_door_and_eta():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    t1 = t0 + dt.timedelta(seconds=10)
    tracker.update(_reading(t0, 25.2854, 51.531, temp=3.0, door=False), 4.0, 32.5)
    out = tracker.update(_reading(t1, 25.2864, 51.531, temp=7.0, door=True), 4.0, 32.5)

    assert out["interval_s"] == 10.0
    assert 0.10 < out["distance_km"] < 0.12
    assert 0.10 < out["traveled_km"] < 0.12
    assert out["temperature_deviation_c"] == 3.0
    assert out["time_above_threshold_s"] == 10.0
    assert out["door_duration_s"] == 10.0
    expected_remaining = 32.5 - out["traveled_km"]
    assert abs(out["remaining_km"] - round(expected_remaining, 4)) < 1e-6
    assert abs(out["eta_minutes"] - expected_remaining / 42.0 * 60.0) < 0.05


def test_no_eta_when_stationary():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    tracker.update(_reading(t0, 25.2854, 51.531, speed=0.0), 4.0, 32.5)
    out = tracker.update(_reading(t0 + dt.timedelta(seconds=10), 25.2854, 51.531, speed=0.0), 4.0, 32.5)
    assert out["eta_minutes"] is None


def test_out_of_order_timestamp_does_not_corrupt_state():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    tracker.update(_reading(t0, 25.28, 51.53), 4.0, None)
    out = tracker.update(_reading(t0 - dt.timedelta(seconds=5), 25.28, 51.53), 4.0, None)
    assert out["interval_s"] == 0.0
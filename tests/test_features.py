"""Deterministic thermal-exposure and deterioration mathematics."""
from __future__ import annotations

import datetime as dt

from backend.intelligence import features

BATCH = {
    "id": "CHK-1029",
    "product": "Fresh Chicken",
    "safeMinTempC": 0.0,
    "safeMaxTempC": 4.0,
    "idealTempC": 2.0,
    "initialShelfLifeHours": 168.0,
    "activationEnergyJMol": 90000.0,
    "humidityLimitPct": 90.0,
    "quantityKg": 500.0,
    "valuePerKg": 20.0,
}


def _reading(ts, temp, humidity=74, lat=25.28, lon=51.53, speed=42, door=False, refr=True):
    return {
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp, "humidityPct": humidity,
        "latitude": lat, "longitude": lon, "speedKmh": speed,
        "gForce": 0.2, "doorOpen": door, "refrigerationOn": refr,
    }


def test_thermal_exposure_accumulates_above_safe_max():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    out = features.compute([_reading(t0, 10.0), _reading(t0 + dt.timedelta(minutes=10), 10.0)], BATCH)
    # 6 C over the limit for 10 minutes
    assert abs(out["thermalExposure"] - 60.0) < 1e-6
    assert out["exposureMinutes"] == 10.0
    assert out["timeAboveThresholdSeconds"] == 600.0


def test_exposure_ignores_temperatures_inside_the_envelope():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    out = features.compute([_reading(t0, 3.0), _reading(t0 + dt.timedelta(minutes=10), 3.0)], BATCH)
    assert out["thermalExposure"] == 0.0


def test_deterioration_rate_at_ideal_is_one_over_shelf_life():
    rate = features.deterioration_rate(2.0, 2.0, 168.0, 90000.0)
    assert abs(rate - 1.0 / 168.0) < 1e-12


def test_warmer_deteriorates_faster():
    cold = features.deterioration_rate(2.0, 2.0, 168.0, 90000.0)
    warm = features.deterioration_rate(8.0, 2.0, 168.0, 90000.0)
    hot = features.deterioration_rate(20.0, 2.0, 168.0, 90000.0)
    assert cold < warm < hot


def test_one_hour_at_ideal_consumes_one_hour_of_shelf_life():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    out = features.compute([_reading(t0, 2.0), _reading(t0 + dt.timedelta(hours=1), 2.0)], BATCH)
    assert abs(out["deteriorationFraction"] - 1.0 / 168.0) < 1e-5
    assert abs(out["remainingShelfLifeHours"] - 167.0) < 0.05


def test_remaining_shelf_life_never_negative():
    t0 = dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)
    out = features.compute([_reading(t0, 35.0), _reading(t0 + dt.timedelta(days=30), 35.0)], BATCH)
    assert out["deteriorationFraction"] == 1.0
    assert out["remainingShelfLifeHours"] == 0.0


def test_empty_window_is_safe():
    out = features.compute([], BATCH)
    assert out["thermalExposure"] == 0.0
    assert out["deteriorationFraction"] == 0.0
    assert out["remainingShelfLifeHours"] == 168.0
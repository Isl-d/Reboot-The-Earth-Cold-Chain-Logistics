"""Baseline risk: documented factors, max-combination, and band thresholds."""
from __future__ import annotations

from backend.risk import baseline_risk, risk_level


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


def test_band_thresholds():
    assert risk_level(0) == "LOW"
    assert risk_level(24) == "LOW"
    assert risk_level(25) == "MEDIUM"
    assert risk_level(49) == "MEDIUM"
    assert risk_level(50) == "HIGH"
    assert risk_level(74) == "HIGH"
    assert risk_level(75) == "CRITICAL"
    assert risk_level(100) == "CRITICAL"


def test_clean_reading_is_low():
    out = baseline_risk(_reading(), {}, 4.0)
    assert out["riskScore"] == 0
    assert out["riskLevel"] == "LOW"


def test_refrigeration_off_dominates():
    out = baseline_risk(_reading(refrigeration_on=False), {}, 4.0)
    assert out["riskScore"] == 80
    assert out["riskLevel"] == "CRITICAL"


def test_full_temperature_excursion():
    out = baseline_risk(_reading(temperature_c=10.0), {}, 4.0)
    assert out["factors"]["temperature_excursion"] == 100
    assert out["riskLevel"] == "CRITICAL"


def test_risk_is_the_max_of_independent_factors():
    # 3 C over the limit -> 50; traffic -> 40.  The larger wins.
    out = baseline_risk(_reading(temperature_c=7.0, speed_kmh=5.0), {}, 4.0)
    assert out["factors"]["temperature_excursion"] == 50
    assert out["factors"]["traffic_delay"] == 40
    assert out["riskScore"] == 50


def test_sustained_excursion_accumulates():
    out = baseline_risk(_reading(), {"time_above_threshold_s": 60}, 4.0)
    assert out["riskScore"] == 50
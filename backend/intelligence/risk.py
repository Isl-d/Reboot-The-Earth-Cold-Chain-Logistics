"""Combined risk score (Person 4 §3).

Blends thermal exposure, humidity exposure, product age, remaining shelf life,
spoilage probability, route delay and anomaly severity. A single critical
signal (high spoilage, severe anomaly) floors the score so it can never be
hidden by an otherwise healthy batch. Thresholds come from config, via the
same bands the baseline uses.
"""
from __future__ import annotations

from ..config import settings
from ..risk import risk_level

# Weights sum to 1.0; documented here, not scattered through the code.
_WEIGHTS = {
    "spoilage_probability": 0.30,
    "thermal_exposure": 0.20,
    "remaining_shelf_life": 0.20,
    "anomaly": 0.15,
    "route_delay": 0.10,
    "humidity_exposure": 0.05,
}

# (condition factor value, score floor)
_FLOORS = (
    ("spoilage_probability", 80.0, 80.0),
    ("anomaly", 90.0, 78.0),
    ("thermal_exposure", 100.0, 75.0),
)


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def score(features: dict, spoilage: dict, anomaly: dict,
          route_delay_min: float = 0.0) -> dict:
    shelf_life = float(features.get("initialShelfLifeHours") or 1.0)
    remaining = float(features.get("remainingShelfLifeHours") or 0.0)
    age_fraction = _clamp(1.0 - remaining / max(shelf_life, 1e-9)) * 100.0

    factors = {
        "spoilage_probability": _clamp(float(spoilage.get("spoilageProbability") or 0.0) * 100.0),
        "thermal_exposure": _clamp(float(features.get("thermalExposure") or 0.0) / 60.0 * 100.0),
        "remaining_shelf_life": age_fraction,
        "anomaly": _clamp(float(anomaly.get("score") or 0.0) * 100.0) if anomaly.get("anomaly") else 0.0,
        "route_delay": _clamp(float(route_delay_min) / 30.0 * 100.0),
        "humidity_exposure": _clamp(float(features.get("humidityExposure") or 0.0) / 120.0 * 100.0),
    }

    combined = sum(_WEIGHTS[name] * value for name, value in factors.items())
    for name, threshold, floor in _FLOORS:
        if factors.get(name, 0.0) >= threshold:
            combined = max(combined, floor)

    combined = _clamp(round(combined))
    return {
        "riskScore": int(combined),
        "riskLevel": risk_level(combined),
        "factors": {k: round(v, 1) for k, v in factors.items()},
        "bands": {
            "lowMax": settings.risk_low_max,
            "mediumMax": settings.risk_medium_max,
            "highMax": settings.risk_high_max,
        },
    }
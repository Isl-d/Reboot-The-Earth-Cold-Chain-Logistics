"""Deterministic thermal-exposure and deterioration mathematics (Person 4 §1–2).

Pure Python, no ML. These numbers are the facts the LLM is allowed to reason
*about*; the LLM never computes or overrides them.

Thermal exposure::

    E_T = Σ max(0, T_i - T_safe) · Δt          [°C·min]

Deterioration uses a configurable Arrhenius model relative to the product's
ideal storage temperature, so the rate is exactly ``1 / shelf_life`` at the
ideal temperature and rises as the product warms::

    k(T) = k_ref · exp( Ea/R · (1/T_ideal - 1/T) )
    D    = Σ k(T_i) · Δt_i                     (fraction of shelf life spent)
    remaining_shelf_life = shelf_life · (1 - D)

This is a prototype and must not be presented as certified food-safety science.
"""
from __future__ import annotations

import datetime as dt
import math

from ..config import settings


def _parse_ts(value) -> dt.datetime | None:
    if isinstance(value, dt.datetime):
        return value if value.tzinfo else value.replace(tzinfo=dt.timezone.utc)
    if value is None:
        return None
    try:
        return dt.datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None


def _get(reading: dict, *names, default=None):
    for name in names:
        if name in reading and reading[name] is not None:
            return reading[name]
    return default


def kelvin(celsius: float) -> float:
    return celsius + 273.15


def deterioration_rate(temp_c: float, ideal_c: float, shelf_life_hours: float, activation_energy: float) -> float:
    """Fraction of shelf life consumed per hour at ``temp_c``."""
    if shelf_life_hours <= 0:
        return 0.0
    k_ref = 1.0 / shelf_life_hours
    exponent = (activation_energy / settings.gas_constant_j_mol_k) * (
        1.0 / kelvin(ideal_c) - 1.0 / kelvin(temp_c)
    )
    return k_ref * math.exp(exponent)


def compute(telemetry: list[dict], batch: dict | None) -> dict:
    """Summarize a telemetry window against one batch's safe envelope."""
    batch = batch or {}
    safe_max = float(batch.get("safeMaxTempC", batch.get("safe_max_temp_c", 4.0)))
    safe_min = float(batch.get("safeMinTempC", batch.get("safe_min_temp_c", 0.0)))
    ideal = float(batch.get("idealTempC", (safe_min + safe_max) / 2.0))
    shelf_life = float(batch.get("initialShelfLifeHours", batch.get("initial_shelf_life_hours", 168.0)))
    ea = float(batch.get("activationEnergyJMol") or settings.activation_energy_default_j_mol)
    humidity_limit = float(batch.get("humidityLimitPct") or 99.0)

    thermal_exposure = 0.0
    humidity_exposure = 0.0
    deterioration = 0.0
    time_above_s = 0.0
    time_above_min = 0.0
    door_open_s = 0.0
    distance_km = 0.0
    speeds: list[float] = []
    temperatures: list[float] = []

    previous: dt.datetime | None = None
    previous_latlon: tuple[float, float] | None = None

    for reading in telemetry:
        temp = _get(reading, "temperatureC", "temperature_c", "temperature")
        humidity = _get(reading, "humidityPct", "humidity_pct", "humidity")
        lat = _get(reading, "latitude", "lat")
        lon = _get(reading, "longitude", "lon")
        speed = _get(reading, "speedKmh", "speed_kmh", "speed")
        ts = _parse_ts(_get(reading, "timestamp", "ts"))

        if temp is not None:
            temperatures.append(float(temp))
        if speed is not None:
            speeds.append(float(speed))

        if ts is not None and previous is not None:
            delta_h = max(0.0, (ts - previous).total_seconds()) / 3600.0
            delta_min = delta_h * 60.0
            if temp is not None:
                over = max(0.0, float(temp) - safe_max)
                thermal_exposure += over * delta_min
                if over > 0:
                    time_above_s += delta_min * 60.0
                    time_above_min += delta_min
                deterioration += deterioration_rate(float(temp), ideal, shelf_life, ea) * delta_h
            if humidity is not None:
                humidity_exposure += max(0.0, float(humidity) - humidity_limit) * delta_min
            if _get(reading, "doorOpen", "door_open"):
                door_open_s += delta_min * 60.0
        if previous_latlon and None not in (lat, lon, *previous_latlon):
            from ..geo import haversine_km

            distance_km += haversine_km(previous_latlon[0], previous_latlon[1], float(lat), float(lon))

        previous = ts or previous
        if lat is not None and lon is not None:
            previous_latlon = (float(lat), float(lon))

    deterioration = min(1.0, deterioration)
    remaining = max(0.0, shelf_life * (1.0 - deterioration))
    avg_speed = sum(speeds) / len(speeds) if speeds else 0.0

    return {
        "thermalExposure": round(thermal_exposure, 3),
        "exposureMinutes": round(time_above_min, 2),
        "deteriorationFraction": round(deterioration, 5),
        "remainingShelfLifeHours": round(remaining, 3),
        "timeAboveThresholdMinutes": round(time_above_min, 2),
        "timeAboveThresholdSeconds": round(time_above_s, 1),
        "humidityExposure": round(humidity_exposure, 3),
        "doorOpenSeconds": round(door_open_s, 1),
        "windowDistanceKm": round(distance_km, 3),
        "avgSpeedKmh": round(avg_speed, 2),
        "latestTemperatureC": round(temperatures[-1], 2) if temperatures else None,
        "currentDeviationC": round(max(0.0, temperatures[-1] - safe_max), 2) if temperatures else 0.0,
        "minTemperatureC": round(min(temperatures), 2) if temperatures else None,
        "maxTemperatureC": round(max(temperatures), 2) if temperatures else None,
        "readings": len(telemetry),
        "safeMinTempC": safe_min,
        "safeMaxTempC": safe_max,
        "idealTempC": ideal,
        "initialShelfLifeHours": shelf_life,
    }
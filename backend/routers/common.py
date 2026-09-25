"""Shared helpers for the REST routers."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..cache import cache
from ..models import Prediction, SensorReading


def _iso(value: dt.datetime | None) -> str | None:
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=dt.timezone.utc)
    return value.astimezone(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def reading_from_row(row: SensorReading) -> dict:
    return {
        "truckId": row.truck_id,
        "timestamp": _iso(row.ts),
        "temperatureC": row.temperature_c,
        "humidityPct": row.humidity_pct,
        "latitude": row.latitude,
        "longitude": row.longitude,
        "speedKmh": row.speed_kmh,
        "gForce": row.g_force,
        "doorOpen": row.door_open,
        "refrigerationOn": row.refrigeration_on,
    }


def truck_state(truck_id: str) -> dict:
    """Latest reading + derived + baseline risk, Redis first then the database."""
    state = cache.get_truck_state(truck_id)
    if state:
        return state
    return {"reading": None, "derived": {}, "risk": None}


def last_reading(session: Session, truck_id: str) -> SensorReading | None:
    return session.execute(
        select(SensorReading).where(SensorReading.truck_id == truck_id)
        .order_by(SensorReading.ts.desc()).limit(1)
    ).scalar_one_or_none()


def latest_prediction(session: Session, truck_id: str) -> Prediction | None:
    return session.execute(
        select(Prediction).where(Prediction.truck_id == truck_id)
        .order_by(Prediction.created_at.desc()).limit(1)
    ).scalar_one_or_none()


def prediction_wire(pred: Prediction) -> dict:
    return {
        "thermalExposure": pred.thermal_exposure,
        "remainingShelfLifeHours": pred.remaining_shelf_life_hours,
        "spoilageProbability": pred.spoilage_probability,
        "confidence": pred.confidence,
        "riskScore": pred.risk_score,
        "riskLevel": pred.risk_level,
        "modelVersion": pred.model_version,
        "createdAt": _iso(pred.created_at),
    }
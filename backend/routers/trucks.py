"""Truck endpoints for the command center and fleet screens."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..cache import cache
from ..db import session_scope
from ..models import Incident, ProductBatch, Product, Route, Truck
from sqlalchemy import select

from . import common

router = APIRouter(prefix="/api/trucks", tags=["trucks"])


def _current(session, truck: Truck) -> dict:
    state = common.truck_state(truck.id)
    reading = state.get("reading")
    if reading is None:
        row = common.last_reading(session, truck.id)
        reading = common.reading_from_row(row) if row else None

    risk = state.get("risk") or {}
    pred = common.latest_prediction(session, truck.id)
    if pred and pred.risk_score is not None:
        risk_score, risk_level = pred.risk_score, pred.risk_level
    else:
        risk_score, risk_level = risk.get("riskScore"), risk.get("riskLevel")

    active = session.execute(
        select(Incident.id).where(Incident.truck_id == truck.id, Incident.status == "OPEN").limit(1)
    ).first()

    # Resolve batch/product info for SimTruckOptionDto fields
    batch_id = truck.current_batch_id
    product_name: str | None = None
    quantity_kg: float | None = None
    if batch_id:
        batch = session.get(ProductBatch, batch_id)
        if batch:
            quantity_kg = batch.quantity_kg
            product = session.get(Product, batch.product_id)
            product_name = product.name if product else batch.product_id

    return {
        # Original fields (backward compat for Person 1)
        "id": truck.id,
        "name": truck.name,
        "latitude": (reading or {}).get("latitude"),
        "longitude": (reading or {}).get("longitude"),
        "speedKmh": (reading or {}).get("speedKmh"),
        "temperatureC": (reading or {}).get("temperatureC"),
        "humidityPct": (reading or {}).get("humidityPct"),
        "gForce": (reading or {}).get("gForce"),
        "doorOpen": (reading or {}).get("doorOpen"),
        "refrigerationOn": (reading or {}).get("refrigerationOn"),
        "riskScore": risk_score,
        "riskLevel": risk_level,
        "activeIncident": active is not None,
        "lastUpdated": (reading or {}).get("timestamp"),
        # SimTruckOptionDto fields
        "truckId": truck.id,
        "label": truck.name,
        "batchId": batch_id,
        "product": product_name,
        "quantityKg": quantity_kg,
    }


def fleet_snapshot() -> list[dict]:
    """The live fleet view, shared by GET /api/trucks and the /ws/live HELLO."""
    with session_scope() as session:
        trucks = session.execute(select(Truck).order_by(Truck.id)).scalars().all()
        return [_current(session, t) for t in trucks]


@router.get("")
def list_trucks() -> dict:
    return {"trucks": fleet_snapshot()}


@router.get("/{truck_id}")
def get_truck(truck_id: str) -> dict:
    with session_scope() as session:
        truck = session.get(Truck, truck_id)
        if truck is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")

        batch = session.get(ProductBatch, truck.current_batch_id) if truck.current_batch_id else None
        route = session.get(Route, truck.route_id) if truck.route_id else None
        state = common.truck_state(truck_id)
        reading = state.get("reading")
        if reading is None:
            row = common.last_reading(session, truck_id)
            reading = common.reading_from_row(row) if row else None
        risk = state.get("risk") or {}
        pred = common.latest_prediction(session, truck_id)

        prediction = {
            "thermalExposure": None,
            "remainingShelfLifeHours": None,
            "spoilageProbability": None,
            "confidence": None,
            "riskScore": risk.get("riskScore"),
            "riskLevel": risk.get("riskLevel"),
            "source": "baseline",
            "factors": risk.get("factors", {}),
        }
        recommendation = None
        if pred is not None:
            prediction.update(common.prediction_wire(pred))
            prediction["source"] = "person4"
            recommendation = pred.recommendation

        truck_out = {
            "id": truck.id,
            "productBatchId": truck.current_batch_id,
            "latitude": (reading or {}).get("latitude"),
            "longitude": (reading or {}).get("longitude"),
            "temperatureC": (reading or {}).get("temperatureC"),
            "humidityPct": (reading or {}).get("humidityPct"),
            "speedKmh": (reading or {}).get("speedKmh"),
            "gForce": (reading or {}).get("gForce"),
            "doorOpen": (reading or {}).get("doorOpen"),
            "refrigerationOn": (reading or {}).get("refrigerationOn"),
            "routeId": truck.route_id,
            "routeName": route.name if route else None,
        }
        batch_out = None
        if batch is not None:
            product = session.get(Product, batch.product_id)
            batch_out = {
                "id": batch.id,
                "product": product.name if product else batch.product_id,
                "quantityKg": batch.quantity_kg,
                "productionDate": batch.production_date.isoformat() if batch.production_date else None,
                "expiryDate": batch.expiry_date.isoformat() if batch.expiry_date else None,
                "safeMinTempC": batch.safe_min_temp_c,
                "safeMaxTempC": batch.safe_max_temp_c,
                "initialShelfLifeHours": batch.initial_shelf_life_hours,
            }
        return {
            "truck": truck_out,
            "batch": batch_out,
            "prediction": prediction,
            "recommendation": recommendation,
        }
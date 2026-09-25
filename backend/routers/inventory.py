"""Inventory by batch — enriched with AI forecast and spoilage data."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..db import session_scope
from ..intelligence.forecasting import forecast
from ..intelligence.inventory_opt import recommend
from ..models import Inventory, Prediction, Product, ProductBatch, Truck

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _latest_prediction_for_truck(session, truck_id: str) -> Prediction | None:
    if not truck_id:
        return None
    return session.execute(
        select(Prediction)
        .where(Prediction.truck_id == truck_id)
        .order_by(Prediction.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def _enrich(session, inv: Inventory) -> dict:
    batch = session.get(ProductBatch, inv.batch_id)
    product_name: str | None = None
    shelf_life_days = 7
    if batch:
        product = session.get(Product, batch.product_id)
        product_name = product.name if product else batch.product_id
        if batch.initial_shelf_life_hours:
            shelf_life_days = max(1, round(batch.initial_shelf_life_hours / 24))

    # Find the truck that currently carries this batch
    truck_row = session.execute(
        select(Truck.id).where(Truck.current_batch_id == inv.batch_id).limit(1)
    ).first()
    truck_id: str | None = truck_row[0] if truck_row else None

    # Get spoilage probability from the latest prediction for that truck
    spoilage_probability = 0.0
    pred = _latest_prediction_for_truck(session, truck_id)
    if pred and pred.spoilage_probability is not None:
        spoilage_probability = float(pred.spoilage_probability)

    # Demand forecast
    days_to_expiry: int | None = None
    if inv.expiry_date:
        days_to_expiry = (inv.expiry_date - dt.date.today()).days

    fc = forecast(inv.batch_id, inv.quantity_kg, days=3, shelf_life_days=shelf_life_days)
    rec = recommend(inv.quantity_kg, fc["forecastDemandKg"], days_to_expiry, inv.location_type)

    return {
        "batchId": inv.batch_id,
        "product": product_name,
        "locationId": inv.location_id,
        "quantityKg": inv.quantity_kg,
        "expiryDate": inv.expiry_date.isoformat() if inv.expiry_date else None,
        "predictedDemandKg": fc["forecastDemandKg"],
        "expectedExcessKg": rec["expectedExcessKg"],
        "spoilageProbability": round(spoilage_probability, 4),
        "recommendation": rec["action"],
        "truckId": truck_id,
        # extra fields kept for backward compat
        "id": inv.id,
        "locationType": inv.location_type,
        "status": inv.status,
    }


@router.get("")
def list_inventory() -> dict:
    with session_scope() as session:
        rows = session.execute(select(Inventory).order_by(Inventory.batch_id)).scalars().all()
        return {"inventory": [_enrich(session, inv) for inv in rows]}


@router.get("/{batch_id}")
def inventory_for_batch(batch_id: str) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(Inventory).where(Inventory.batch_id == batch_id).order_by(Inventory.id)
        ).scalars().all()
        if not rows:
            raise HTTPException(status_code=404, detail=f"no inventory for batch '{batch_id}'")
        return [_enrich(session, inv) for inv in rows]

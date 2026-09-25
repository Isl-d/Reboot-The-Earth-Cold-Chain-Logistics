"""The normalized context bundle handed to the intelligence engine.

This is the single implementation of the Person 3 → Person 4 seam: the HTTP
endpoint ``GET /api/internal/context/{truckId}`` and the background intelligence
engine both call :func:`build_context`, so they can never disagree.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import Product, ProductBatch, Route, SensorReading, Truck, Warehouse
from .routers import common


def _batch_wire(session: Session, batch: ProductBatch | None) -> dict | None:
    if batch is None:
        return None
    product = session.get(Product, batch.product_id)
    return {
        "id": batch.id,
        "product": product.name if product else batch.product_id,
        "quantityKg": batch.quantity_kg,
        "productionDate": batch.production_date.isoformat() if batch.production_date else None,
        "expiryDate": batch.expiry_date.isoformat() if batch.expiry_date else None,
        "safeMinTempC": batch.safe_min_temp_c,
        "safeMaxTempC": batch.safe_max_temp_c,
        "initialShelfLifeHours": batch.initial_shelf_life_hours,
        "valuePerKg": product.value_per_kg if product else None,
        "activationEnergyJMol": product.activation_energy_j_mol if product else None,
        "idealTempC": product.ideal_temp_c if product else None,
        "humidityLimitPct": product.humidity_limit_pct if product else None,
    }


def build_context(session: Session, truck_id: str, telemetry: int = 60) -> dict | None:
    """Return the truck/batch/history/warehouse bundle, or ``None`` if unknown."""
    truck = session.get(Truck, truck_id)
    if truck is None:
        return None

    state = common.truck_state(truck_id)
    reading = state.get("reading") or {}
    if not reading:
        row = common.last_reading(session, truck_id)
        reading = common.reading_from_row(row) if row else {}

    batch = session.get(ProductBatch, truck.current_batch_id) if truck.current_batch_id else None
    readings = session.execute(
        select(SensorReading)
        .where(SensorReading.truck_id == truck_id)
        .order_by(SensorReading.ts.desc())
        .limit(telemetry)
    ).scalars().all()
    recent = [common.reading_from_row(r) for r in reversed(readings)]

    warehouses = session.execute(select(Warehouse).order_by(Warehouse.id)).scalars().all()
    candidates = [{
        "id": w.id, "name": w.name,
        "latitude": w.latitude, "longitude": w.longitude,
        "capacityKg": w.capacity_kg, "availableCapacityKg": w.available_capacity_kg,
        "minTempC": w.min_temp_c, "maxTempC": w.max_temp_c,
    } for w in warehouses]

    route = session.get(Route, truck.route_id) if truck.route_id else None

    return {
        "truck": {
            "id": truck.id,
            "latitude": reading.get("latitude"),
            "longitude": reading.get("longitude"),
            "speedKmh": reading.get("speedKmh"),
            "routeId": truck.route_id,
            "routeDistanceKm": route.distance_km if route else None,
            "routeDurationMin": route.duration_min if route else None,
        },
        "batch": _batch_wire(session, batch),
        "derived": state.get("derived") or {},
        "liveRisk": state.get("risk") or {},
        "recentTelemetry": recent,
        "candidateWarehouses": candidates,
    }
"""Warehouse reference data."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..db import session_scope
from ..models import Warehouse

router = APIRouter(prefix="/api/warehouses", tags=["warehouses"])


def _wire(w: Warehouse) -> dict:
    return {
        "id": w.id,
        "name": w.name,
        "latitude": w.latitude,
        "longitude": w.longitude,
        "capacityKg": w.capacity_kg,
        "availableCapacityKg": w.available_capacity_kg,
        "minTempC": w.min_temp_c,
        "maxTempC": w.max_temp_c,
    }


@router.get("")
def list_warehouses() -> dict:
    with session_scope() as session:
        rows = session.execute(select(Warehouse).order_by(Warehouse.id)).scalars().all()
        return {"warehouses": [_wire(w) for w in rows]}


@router.get("/{warehouse_id}")
def get_warehouse(warehouse_id: str) -> dict:
    with session_scope() as session:
        row = session.get(Warehouse, warehouse_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"unknown warehouse '{warehouse_id}'")
        return _wire(row)
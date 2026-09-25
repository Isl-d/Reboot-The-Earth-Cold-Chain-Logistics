"""Inventory by batch."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from ..db import session_scope
from ..models import Inventory

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _wire(inv: Inventory) -> dict:
    return {
        "id": inv.id,
        "batchId": inv.batch_id,
        "locationType": inv.location_type,
        "locationId": inv.location_id,
        "quantityKg": inv.quantity_kg,
        "expiryDate": inv.expiry_date.isoformat() if inv.expiry_date else None,
        "status": inv.status,
    }


@router.get("")
def list_inventory() -> dict:
    with session_scope() as session:
        rows = session.execute(select(Inventory).order_by(Inventory.batch_id)).scalars().all()
        return {"inventory": [_wire(i) for i in rows]}


@router.get("/{batch_id}")
def inventory_for_batch(batch_id: str) -> list[dict]:
    with session_scope() as session:
        rows = session.execute(
            select(Inventory).where(Inventory.batch_id == batch_id).order_by(Inventory.id)
        ).scalars().all()
        if not rows:
            raise HTTPException(status_code=404, detail=f"no inventory for batch '{batch_id}'")
        return [_wire(i) for i in rows]
"""Store reference data — the destination end of the cold chain."""
from __future__ import annotations

from fastapi import APIRouter

from ..db import session_scope
from ..models import Store
from sqlalchemy import select

router = APIRouter(prefix="/api/stores", tags=["stores"])


def _wire(s: Store) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "latitude": s.latitude,
        "longitude": s.longitude,
        "capacityKg": s.capacity_kg,
    }


@router.get("")
def list_stores() -> dict:
    with session_scope() as session:
        rows = session.execute(select(Store).order_by(Store.id)).scalars().all()
        return {"stores": [_wire(s) for s in rows]}
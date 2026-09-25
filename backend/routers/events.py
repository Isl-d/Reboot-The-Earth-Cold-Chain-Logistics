"""Device-event endpoints: what changed, as opposed to what the sensors read."""
from __future__ import annotations

from fastapi import APIRouter, Query
from sqlalchemy import select

from ..db import session_scope
from ..models import DeviceEvent

router = APIRouter(tags=["events"])


def _wire(row: DeviceEvent) -> dict:
    ts = row.ts
    if ts is not None and ts.tzinfo is None:
        import datetime as dt
        ts = ts.replace(tzinfo=dt.timezone.utc)
    return {
        "id": row.id,
        "truckId": row.truck_id,
        "deviceId": row.device_id,
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ") if ts else None,
        "type": row.type,
        "detail": row.detail,
        "value": row.value,
    }


@router.get("/api/trucks/{truck_id}/events")
def truck_events(truck_id: str, limit: int = Query(default=100, ge=1, le=1000)) -> dict:
    with session_scope() as session:
        rows = session.execute(
            select(DeviceEvent).where(DeviceEvent.truck_id == truck_id)
            .order_by(DeviceEvent.ts.desc()).limit(limit)
        ).scalars().all()
    events = [_wire(r) for r in reversed(rows)]
    return {"truckId": truck_id, "count": len(events), "events": events}


@router.get("/api/device-events")
def all_events(limit: int = Query(default=100, ge=1, le=1000)) -> dict:
    with session_scope() as session:
        rows = session.execute(
            select(DeviceEvent).order_by(DeviceEvent.ts.desc()).limit(limit)
        ).scalars().all()
    events = [_wire(r) for r in reversed(rows)]
    return {"count": len(events), "events": events}
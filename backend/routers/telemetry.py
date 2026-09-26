"""Historical telemetry for Person 2's charts."""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from ..db import session_scope
from ..models import SensorReading, Truck
from . import common

router = APIRouter(prefix="/api/trucks", tags=["telemetry"])


def _parse(value: str | None) -> dt.datetime | None:
    if not value:
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


@router.get("/{truck_id}/telemetry")
def telemetry(
    truck_id: str,
    from_: str | None = Query(default=None, alias="from"),
    to: str | None = Query(default=None),
    limit: int = Query(default=500, ge=1, le=5000),
) -> list[dict]:
    start = _parse(from_)
    end = _parse(to)
    with session_scope() as session:
        if session.get(Truck, truck_id) is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
        stmt = select(SensorReading).where(SensorReading.truck_id == truck_id)
        if start is not None:
            stmt = stmt.where(SensorReading.ts >= start)
        if end is not None:
            stmt = stmt.where(SensorReading.ts <= end)
        # The newest `limit` readings in the window, returned oldest first.
        # Taking the *first* `limit` froze live charts once a truck had more
        # than `limit` readings (~25 min at the 3 s cadence): every poll got
        # the same old slice back.
        stmt = stmt.order_by(SensorReading.ts.desc()).limit(limit)
        rows = session.execute(stmt).scalars().all()
        return [common.reading_from_row(r) for r in reversed(rows)]
"""Cold-chain incidents, open and historical."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import select

from ..db import session_scope
from ..models import Incident

router = APIRouter(prefix="/api/incidents", tags=["incidents"])


def _wire(row: Incident) -> dict:
    created = row.created_at.isoformat() if row.created_at else None
    return {
        "id": row.id,
        "truckId": row.truck_id,
        "batchId": row.batch_id,
        "severity": row.severity,
        "type": row.type,
        "message": row.message,
        "createdAt": created,
        "updatedAt": row.updated_at.isoformat() if row.updated_at else created,
        "status": row.status,
    }


@router.get("")
def list_incidents(
    status: str | None = Query(default=None, description="OPEN | RESOLVED"),
    truckId: str | None = Query(default=None),
    limit: int = Query(default=200, ge=1, le=2000),
) -> list[dict]:
    stmt = select(Incident)
    if status:
        stmt = stmt.where(Incident.status == status.upper())
    if truckId:
        stmt = stmt.where(Incident.truck_id == truckId)
    stmt = stmt.order_by(Incident.created_at.desc()).limit(limit)
    with session_scope() as session:
        return [_wire(r) for r in session.execute(stmt).scalars().all()]


@router.get("/{incident_id}")
def get_incident(incident_id: str) -> dict:
    with session_scope() as session:
        row = session.get(Incident, incident_id)
        if row is None:
            raise HTTPException(status_code=404, detail=f"unknown incident '{incident_id}'")
        return _wire(row)
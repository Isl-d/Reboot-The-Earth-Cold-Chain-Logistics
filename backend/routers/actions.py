"""Actions — the point where intelligence stops advising and acts.

A recommendation is advice: "DIVERT to WH01". An **Action** is the recorded,
auditable fact that the advice was carried out — a diversion dispatched, stock
prioritised for sale, an incident acknowledged. Each action is stored, broadcast
on the WebSocket as ``ACTION_EXECUTED``, and reflected in live state.

Two ways in:

* ``POST /api/actions/execute`` — an operator (or the UI) executes a choice.
* ``POST /api/actions/auto/{truckId}`` — the system executes the engine's own
  recommendation, but only when risk is HIGH/CRITICAL and the engine proposed a
  concrete action. This is bounded AI action: the decision is deterministic, and
  the action is recorded with ``source: "auto"``.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, update

from ..cache import cache
from ..db import session_scope
from ..models import Action, Incident, Inventory, Prediction, Truck
from ..ws import manager

router = APIRouter(prefix="/api/actions", tags=["actions"])

ALLOWED_ACTIONS = {
    "CONTINUE", "MONITOR", "PREPARE_INTERVENTION", "DIVERT",
    "REDISTRIBUTE", "PRIORITIZE_SALE", "TRANSFER", "ACKNOWLEDGE",
}
_AUTO_LEVELS = {"HIGH", "CRITICAL"}


class ActionIn(BaseModel):
    truckId: str | None = None
    batchId: str | None = None
    action: str
    destinationId: str | None = None
    source: str = "operator"


def _wire(row: Action) -> dict:
    created = row.created_at
    if created is not None and created.tzinfo is None:
        created = created.replace(tzinfo=dt.timezone.utc)
    return {
        "id": row.id,
        "truckId": row.truck_id,
        "batchId": row.batch_id,
        "action": row.action,
        "destinationId": row.destination_id,
        "status": row.status,
        "source": row.source,
        "detail": row.detail or {},
        "createdAt": created.strftime("%Y-%m-%dT%H:%M:%SZ") if created else None,
    }


def _resolve(session, truck_id: str | None, batch_id: str | None) -> tuple[str | None, str | None]:
    if truck_id is None and batch_id:
        row = session.execute(
            select(Truck.id).where(Truck.current_batch_id == batch_id).limit(1)
        ).first()
        truck_id = row[0] if row else None
    if batch_id is None and truck_id:
        truck = session.get(Truck, truck_id)
        batch_id = truck.current_batch_id if truck else None
    return truck_id, batch_id


def _execute(body: ActionIn) -> dict:
    action = (body.action or "").upper()
    if action not in ALLOWED_ACTIONS:
        raise HTTPException(status_code=422, detail={
            "error": "unknown action", "allowed": sorted(ALLOWED_ACTIONS)})

    now = dt.datetime.now(dt.timezone.utc)
    effects: dict = {}
    with session_scope() as session:
        truck_id, batch_id = _resolve(session, body.truckId, body.batchId)
        if truck_id and session.get(Truck, truck_id) is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")

        if action == "ACKNOWLEDGE" and truck_id:
            session.execute(
                update(Incident).where(Incident.truck_id == truck_id, Incident.status == "OPEN")
                .values(status="RESOLVED", updated_at=now)
            )
            effects["incidentsResolved"] = True

        if action in {"PRIORITIZE_SALE", "REDISTRIBUTE", "TRANSFER"} and batch_id:
            session.execute(
                update(Inventory).where(Inventory.batch_id == batch_id)
                .values(status=action.lower(), updated_at=now)
            )
            effects["inventoryStatus"] = action.lower()

        if action == "DIVERT" and body.destinationId:
            effects["destinationId"] = body.destinationId

        row = Action(
            id=f"ACT-{uuid.uuid4().hex[:8].upper()}",
            truck_id=truck_id, batch_id=batch_id, action=action,
            destination_id=body.destinationId, status="EXECUTED",
            source=body.source or "operator", detail=effects or None,
            created_at=now,
        )
        session.add(row)
        payload = _wire(row)

    # Live state changed (incidents resolved, inventory moved): drop the cache so
    # the next read reflects it, and tell every client.
    cache.clear()
    manager.broadcast_threadsafe({"event": "ACTION_EXECUTED", **payload})
    return payload


@router.post("/execute")
def execute_action(body: ActionIn) -> dict:
    """Execute an action (operator- or AI-chosen)."""
    return _execute(body)


@router.post("/auto/{truck_id}")
def auto_action(truck_id: str) -> dict:
    """Auto-pilot: execute the engine's own recommendation for an escalated truck.

    Bounded on purpose — it fires only when risk is HIGH/CRITICAL and the engine
    proposed a concrete action, and it records the action with source ``auto``.
    """
    with session_scope() as session:
        truck = session.get(Truck, truck_id)
        if truck is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
        row = session.execute(
            select(Prediction).where(Prediction.truck_id == truck_id)
            .order_by(Prediction.created_at.desc()).limit(1)
        ).scalar_one_or_none()

    if row is None or row.risk_level not in _AUTO_LEVELS:
        return {"executed": False, "reason": "risk below auto-pilot threshold", "action": None}
    rec = row.recommendation or {}
    action = rec.get("action")
    if not action:
        return {"executed": False, "reason": "no action recommended", "action": None}

    result = _execute(ActionIn(
        truckId=truck_id, batchId=row.batch_id, action=action,
        destinationId=rec.get("destinationId"), source="auto",
    ))
    return {"executed": True, "reason": "recommendation executed", "result": result}


@router.get("")
def list_actions(truckId: str | None = Query(default=None),
                 limit: int = Query(default=50, ge=1, le=500)) -> dict:
    stmt = select(Action).order_by(Action.created_at.desc()).limit(limit)
    if truckId:
        stmt = stmt.where(Action.truck_id == truckId)
    with session_scope() as session:
        rows = session.execute(stmt).scalars().all()
    return {"actions": [_wire(r) for r in rows]}
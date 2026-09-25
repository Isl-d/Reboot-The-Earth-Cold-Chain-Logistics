"""Simulation control — the REST face over the MQTT control topic.

The backend does not run the simulator: it publishes a control message and
the simulator (a separate service) reacts. That keeps the two decoupled.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Body, HTTPException
from sqlalchemy import update

from ..config import settings
from ..db import session_scope
from ..ingest.consumer import pipeline
from ..models import SimulationRun
from ..processing import tracker

router = APIRouter(prefix="/api/simulation", tags=["simulation"])

ALLOWED_SCENARIOS = {
    "NORMAL", "TEMPERATURE_EXCURSION", "DOOR_LEFT_OPEN", "REFRIGERATION_FAILURE",
    "TRAFFIC_DELAY", "COMBINED_FAILURE", "G_FORCE_EVENT",
}


def _record(truck_id: str | None, scenario: str, speed: float) -> str:
    run_id = f"SIM-{uuid.uuid4().hex[:8].upper()}"
    with session_scope() as session:
        session.add(SimulationRun(
            id=run_id, truck_id=truck_id, scenario=scenario,
            speed_multiplier=speed, status="running",
            started_at=dt.datetime.now(dt.timezone.utc),
        ))
    return run_id


def _publish(truck_id: str | None, message: dict) -> bool:
    target = truck_id or "all"
    return pipeline.publish_control(target, message)


@router.post("/start")
def start(body: dict | None = Body(default=None)) -> dict:
    body = body or {}
    truck_id = body.get("truckId")
    _publish(truck_id, {"scenario": "NORMAL", "paused": False})
    run_id = _record(truck_id, "NORMAL", body.get("speedMultiplier", 1.0))
    return {"status": "started", "runId": run_id, "truckId": truck_id}


@router.post("/stop")
def stop(body: dict | None = Body(default=None)) -> dict:
    body = body or {}
    truck_id = body.get("truckId")
    _publish(truck_id, {"paused": True})
    with session_scope() as session:
        stmt = update(SimulationRun).where(SimulationRun.status == "running")
        if truck_id:
            stmt = stmt.where(SimulationRun.truck_id == truck_id)
        session.execute(stmt.values(status="stopped", stopped_at=dt.datetime.now(dt.timezone.utc)))
    return {"status": "stopped", "truckId": truck_id}


@router.post("/reset")
def reset(body: dict | None = Body(default=None)) -> dict:
    body = body or {}
    truck_id = body.get("truckId")
    _publish(truck_id, {"reset": True, "paused": False})
    tracker.reset(truck_id)
    with session_scope() as session:
        stmt = update(SimulationRun).where(SimulationRun.status == "running")
        if truck_id:
            stmt = stmt.where(SimulationRun.truck_id == truck_id)
        session.execute(stmt.values(status="reset", stopped_at=dt.datetime.now(dt.timezone.utc)))
    return {"status": "reset", "truckId": truck_id}


@router.post("/scenario")
def scenario(body: dict = Body(...)) -> dict:
    truck_id = body.get("truckId")
    name = str(body.get("scenario", "")).upper()
    speed = float(body.get("speedMultiplier", 1.0))
    if name not in ALLOWED_SCENARIOS:
        raise HTTPException(status_code=422, detail={
            "error": "unknown scenario",
            "allowed": sorted(ALLOWED_SCENARIOS),
        })
    published = _publish(truck_id, {
        "scenario": name, "speedMultiplier": speed, "paused": False,
    })
    run_id = _record(truck_id, name, speed)
    return {"status": "accepted", "runId": run_id, "truckId": truck_id,
            "scenario": name, "published": published}
"""Simulation control — the REST face over the MQTT control topic.

The backend does not run the simulator: it publishes a control message and
the simulator (a separate service) reacts. That keeps the two decoupled.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, Body, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select, update

from ..cache import cache
from ..config import settings
from ..db import session_scope
from ..ingest.consumer import pipeline
from ..manual import manual
from ..models import DeviceEvent, Incident, Prediction, SensorReading, SimulationRun, Truck
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


def _state_response(truck_id: str | None, status: str, run_id: str, **extra) -> dict:
    """The mutation responses are the full SimulationStateDto plus status/runId.

    The frontend adapter validates the state fields (truckId, batchId,
    startedAt, ...), so a bare ``{status, runId}`` would break Start/Stop/Reset.
    """
    if truck_id:
        payload = _simulation_state(truck_id)
    else:
        payload = {
            "truckId": None, "batchId": None, "scenario": "NORMAL",
            "speedMultiplier": 1.0, "running": True, "startedAt": None,
        }
    payload.update({"status": status, "runId": run_id})
    payload.update(extra)
    return payload


@router.post("/start")
def start(body: dict | None = Body(default=None)) -> dict:
    body = body or {}
    truck_id = body.get("truckId")
    scenario = str(body.get("scenario", "NORMAL")).upper()
    speed = float(body.get("speedMultiplier", 1.0))
    if scenario not in ALLOWED_SCENARIOS:
        scenario = "NORMAL"
    _publish(truck_id, {"scenario": scenario, "speedMultiplier": speed, "paused": False})
    run_id = _record(truck_id, scenario, speed)
    return _state_response(truck_id, "started", run_id)


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
    return _state_response(truck_id, "stopped", "")


@router.post("/reset")
def reset(body: dict | None = Body(default=None)) -> dict:
    body = body or {}
    truck_id = body.get("truckId")
    _publish(truck_id, {"reset": True, "paused": False})
    tracker.reset(truck_id)
    now = dt.datetime.now(dt.timezone.utc)
    with session_scope() as session:
        stmt = update(SimulationRun).where(SimulationRun.status == "running")
        if truck_id:
            stmt = stmt.where(SimulationRun.truck_id == truck_id)
        session.execute(stmt.values(status="reset", stopped_at=now))

        # Reset must clear the *derived history* too, not just the live state.
        # Otherwise the hot readings from the excursion stay inside the
        # intelligence window and the truck reads CRITICAL at 2 C for minutes.
        for model in (SensorReading, DeviceEvent, Prediction):
            stmt = delete(model)
            if truck_id:
                stmt = stmt.where(model.truck_id == truck_id)
            session.execute(stmt)

        incidents = update(Incident).where(Incident.status == "OPEN").values(
            status="RESOLVED", updated_at=now)
        if truck_id:
            incidents = incidents.where(Incident.truck_id == truck_id)
        session.execute(incidents)

    cache.clear()
    # Drop carried-forward explainer rationale and the computed snapshots.
    from ..intelligence import engine as intelligence_engine
    intelligence_engine.clear_rationale(truck_id)
    intelligence_engine.clear_snapshots(truck_id)
    return _state_response(truck_id, "reset", "")


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
    return _state_response(truck_id, "accepted", run_id, published=published, scenario=name)


def _simulation_state(truck_id: str) -> dict:
    """Return the SimulationStateDto for a given truck_id."""
    with session_scope() as session:
        run = session.execute(
            select(SimulationRun)
            .where(SimulationRun.truck_id == truck_id)
            .order_by(SimulationRun.started_at.desc())
            .limit(1)
        ).scalar_one_or_none()

        truck = session.get(Truck, truck_id)
        batch_id = truck.current_batch_id if truck else None

    if run is None:
        return {
            "truckId": truck_id,
            "batchId": batch_id,
            "scenario": "NORMAL",
            "speedMultiplier": 1.0,
            "running": False,
            "startedAt": None,
        }

    started = run.started_at
    if started is not None and started.tzinfo is None:
        started = started.replace(tzinfo=dt.timezone.utc)

    return {
        "truckId": truck_id,
        "batchId": batch_id,
        "scenario": run.scenario,
        "speedMultiplier": run.speed_multiplier,
        "running": run.status == "running",
        "startedAt": started.strftime("%Y-%m-%dT%H:%M:%SZ") if started else None,
    }


@router.get("/state/{truck_id}")
def get_simulation_state(truck_id: str) -> dict:
    return _simulation_state(truck_id)


# ------------------------------------------------------------------ manual mode
class ManualIn(BaseModel):
    truckId: str
    temperatureC: float | None = None
    humidityPct: float | None = None
    speedKmh: float | None = None
    gForce: float | None = None
    doorOpen: bool | None = None
    refrigerationOn: bool | None = None


@router.get("/manual")
def get_manual() -> dict:
    """The current manual overrides, per truck."""
    return {"manual": manual.all()}


@router.post("/manual")
def set_manual(body: ManualIn) -> dict:
    """Set manual telemetry for one truck; the simulator is paused for it."""
    with session_scope() as session:
        if session.get(Truck, body.truckId) is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{body.truckId}'")
    values = body.model_dump(exclude={"truckId"})
    applied = manual.set(body.truckId, values)
    return {"truckId": body.truckId, "manual": True, "values": applied}


@router.delete("/manual/{truck_id}")
def clear_manual(truck_id: str) -> dict:
    """Stop manual mode for one truck and let the simulator resume."""
    manual.clear(truck_id)
    return {"truckId": truck_id, "manual": False}


# NOTE: this /{truck_id} catch-all MUST remain last to avoid shadowing the
# fixed-path routes above (/start, /stop, /reset, /scenario, /state/{truck_id}).
@router.get("/{truck_id}")
def get_simulation_by_truck(truck_id: str) -> dict:
    return _simulation_state(truck_id)
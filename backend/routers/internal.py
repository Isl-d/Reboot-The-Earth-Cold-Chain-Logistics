"""Internal service contract with Person 4 (and the shared data seam).

Person 4 pulls a normalized context bundle from ``GET /api/internal/context``
and pushes predictions back to ``POST /api/internal/predictions``. Stored
predictions override the Person 3 baseline risk everywhere it is read, and
are forwarded to Person 1 over the WebSocket.
"""
from __future__ import annotations

import datetime as dt
import uuid

from fastapi import APIRouter, HTTPException, Query

from ..cache import cache
from ..context import build_context
from ..db import session_scope
from ..models import Prediction, Truck
from ..ws import manager
from . import common
from ..schemas import PredictionIn

router = APIRouter(prefix="/api/internal", tags=["internal"])


@router.get("/context/{truck_id}")
def context(truck_id: str, telemetry: int = Query(default=60, ge=1, le=1000)) -> dict:
    with session_scope() as session:
        bundle = build_context(session, truck_id, telemetry)
    if bundle is None:
        raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
    return bundle


@router.post("/predictions")
def receive_prediction(pred: PredictionIn) -> dict:
    record = Prediction(
        id=pred.id or f"PRED-{uuid.uuid4().hex[:8].upper()}",
        truck_id=pred.truckId,
        batch_id=pred.batchId,
        thermal_exposure=pred.thermalExposure,
        remaining_shelf_life_hours=pred.remainingShelfLifeHours,
        spoilage_probability=pred.spoilageProbability,
        confidence=pred.confidence,
        risk_score=pred.riskScore,
        risk_level=pred.riskLevel,
        recommendation=pred.recommendation,
        model_version=pred.modelVersion,
        created_at=dt.datetime.now(dt.timezone.utc),
    )
    with session_scope() as session:
        if session.get(Truck, pred.truckId) is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{pred.truckId}'")
        session.add(record)

    wire = common.prediction_wire(record) | {"id": record.id, "truckId": record.truck_id,
                                             "batchId": record.batch_id}
    cache.set_prediction(pred.truckId, wire)
    if pred.riskScore is not None:
        cache.set_risk(pred.truckId, {"riskScore": pred.riskScore, "riskLevel": pred.riskLevel,
                                      "source": "person4"})
    manager.broadcast_threadsafe({"event": "PREDICTION_UPDATED", **wire})
    return {"status": "stored", "prediction": wire}
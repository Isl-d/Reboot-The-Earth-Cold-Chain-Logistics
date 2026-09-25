"""The intelligence engine (Person 4 §1–§11).

    context → features → anomaly → spoilage → risk → optimization
            → decision → food-loss → unified response → store → WebSocket

Everything deterministic is computed in code; the LLM only reasons over those
facts. The unified response matches the brief's hand-off shape, and the result
is written to ``predictions`` and pushed to ``/ws/live`` so Person 1 sees the
Person 4 risk instead of the baseline.
"""
from __future__ import annotations

import datetime as dt
import logging
import uuid

from ..cache import cache
from ..config import settings
from ..context import build_context
from ..db import session_scope
from ..models import Prediction
from ..ws import manager
from . import anomaly as anomaly_mod
from . import decision as decision_mod
from . import features as features_mod
from . import foodloss, optimization, risk as risk_mod, spoilage

log = logging.getLogger("coldchain.intelligence")


def _route_delay_minutes(context: dict, derived: dict) -> float:
    remaining_km = derived.get("remaining_km")
    eta = derived.get("eta_minutes")
    if remaining_km is None or eta is None:
        return 0.0
    ideal = remaining_km / max(settings.average_speed_kmh, 1e-9) * 60.0
    return max(0.0, float(eta) - ideal)


def evaluate_context(context: dict, use_llm: bool = True, client=None) -> dict:
    """Run the whole model chain over one context bundle (pure, no DB writes)."""
    batch = context.get("batch")
    telemetry = context.get("recentTelemetry") or []
    derived = context.get("derived") or {}

    feat = features_mod.compute(telemetry, batch)
    anom = anomaly_mod.detect(telemetry, feat, batch)
    sp = spoilage.predict(feat, batch, client=client, use_llm=use_llm)
    route_delay = _route_delay_minutes(context, derived)
    rk = risk_mod.score(feat, sp, anom, route_delay)
    opt = optimization.evaluate(context, feat, sp, client=client, use_llm=use_llm)
    dec = decision_mod.decide(rk, feat, sp, opt)
    loss = foodloss.compute(batch, feat, sp, opt, cause=anom.get("type"))

    latest = feat.get("latestTemperatureC")
    recommendation = {
        "action": dec["action"],
        "destinationId": dec["destinationId"],
        "etaMinutes": dec["etaMinutes"],
        "expectedLossPercent": dec["expectedLossPercent"],
        "foodSavedKg": loss["foodSavedKg"],
        "reasoning": sp.get("rationale"),
    }

    return {
        "batchId": (batch or {}).get("id"),
        "truckId": (context.get("truck") or {}).get("id"),
        "temperatureC": latest,
        "thermalExposure": feat["thermalExposure"],
        "exposureMinutes": feat["exposureMinutes"],
        "deteriorationFraction": feat["deteriorationFraction"],
        "remainingShelfLifeHours": feat["remainingShelfLifeHours"],
        "spoilageProbability": sp["spoilageProbability"],
        "confidence": sp["confidence"],
        "spoilageSource": sp["source"],
        "modelVersion": sp["modelVersion"],
        "riskScore": rk["riskScore"],
        "riskLevel": rk["riskLevel"],
        "riskFactors": rk["factors"],
        "anomaly": anom["anomaly"],
        "anomalyType": anom.get("type"),
        "anomalyScore": anom["score"],
        "routeDelayMinutes": round(route_delay, 2),
        "optimization": opt,
        "foodLoss": loss,
        "decision": dec,
        "recommendation": recommendation,
        "features": feat,
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }


def _persist(result: dict) -> None:
    now = dt.datetime.now(dt.timezone.utc)
    record = Prediction(
        id=f"PRED-{uuid.uuid4().hex[:8].upper()}",
        truck_id=result["truckId"],
        batch_id=result["batchId"],
        thermal_exposure=result["thermalExposure"],
        remaining_shelf_life_hours=result["remainingShelfLifeHours"],
        spoilage_probability=result["spoilageProbability"],
        confidence=result["confidence"],
        risk_score=result["riskScore"],
        risk_level=result["riskLevel"],
        recommendation=result["recommendation"],
        model_version=result["modelVersion"],
        result=result,
        created_at=now,
    )
    with session_scope() as session:
        session.add(record)

    wire = {
        "id": record.id,
        "truckId": record.truck_id,
        "batchId": record.batch_id,
        "thermalExposure": record.thermal_exposure,
        "deteriorationFraction": result["deteriorationFraction"],
        "remainingShelfLifeHours": record.remaining_shelf_life_hours,
        "spoilageProbability": record.spoilage_probability,
        "confidence": record.confidence,
        "riskScore": record.risk_score,
        "riskLevel": record.risk_level,
        "anomaly": result["anomaly"],
        "recommendation": record.recommendation,
        "modelVersion": record.model_version,
        "confidenceSource": result["spoilageSource"],
        "createdAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    cache.set_prediction(result["truckId"], wire)
    if result["riskScore"] is not None:
        cache.set_risk(result["truckId"], {
            "riskScore": result["riskScore"], "riskLevel": result["riskLevel"], "source": "person4",
        })
    manager.broadcast_threadsafe({"event": "PREDICTION_UPDATED", **wire})


def evaluate_truck(truck_id: str, use_llm: bool = True, persist: bool = True,
                   client=None) -> dict | None:
    with session_scope() as session:
        context = build_context(session, truck_id, settings.intelligence_telemetry_window)
    if context is None:
        return None
    result = evaluate_context(context, use_llm=use_llm, client=client)
    if persist:
        _persist(result)
    return result


def mark_dirty(truck_id: str) -> None:
    """Queue a truck for the background worker (no-op when disabled)."""
    if not settings.intelligence_enabled:
        return
    from .worker import worker

    worker.mark_dirty(truck_id)
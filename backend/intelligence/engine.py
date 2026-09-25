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
from . import foodloss, laya as laya_mod, optimization, risk as risk_mod, spoilage

log = logging.getLogger("coldchain.intelligence")

# Last explainer rationale per truck. A deterministic worker cycle (which runs
# every few seconds) must not clobber the explanation the previous LLM-enriched
# cycle produced, so the rationale is carried forward until a reset clears it.
_last_rationale: dict[str, str] = {}


def clear_rationale(truck_id: str | None = None) -> None:
    if truck_id is None:
        _last_rationale.clear()
    else:
        _last_rationale.pop(truck_id, None)


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
    truck_key = (context.get("truck") or {}).get("id")
    if sp.get("rationale"):
        _last_rationale[truck_key] = sp["rationale"]
    reasoning = sp.get("rationale") or _last_rationale.get(truck_key)
    recommendation = {
        "action": dec["action"],
        "destinationId": dec["destinationId"],
        "etaMinutes": dec["etaMinutes"],
        "expectedLossPercent": dec["expectedLossPercent"],
        "foodSavedKg": loss["foodSavedKg"],
        "reasoning": reasoning,
    }

    result = {
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
        "provenance": {
            "temperatureC": "MEASURED",
            "thermalExposure": "CALCULATED",
            "exposureMinutes": "CALCULATED",
            "deteriorationFraction": "CALCULATED",
            "remainingShelfLifeHours": "CALCULATED",
            "spoilageProbability": "PREDICTED",
            "confidence": "PREDICTED",
            "riskScore": "CALCULATED",
            "anomaly": "PREDICTED",
            "routeDelayMinutes": "CALCULATED",
            "optimization": "OPTIMIZED",
            "decision": "CALCULATED",
            "foodLoss": "CALCULATED",
            "recommendation": "AI-EXPLAINED" if (sp.get("source") == "explainer" or reasoning) else "CALCULATED",
            "dataSource": "SYNTHETIC",
        },
        "generatedAt": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
    }

    # System 1 (Laya): local, non-autoregressive, typed decision. It corroborates
    # the deterministic decision above; it never replaces it. Any failure means
    # the key is simply absent.
    sys1 = laya_mod.evaluate(context, result)
    if sys1 is not None:
        result["system1"] = sys1
        result["provenance"]["system1"] = "PREDICTED"

    return result


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
        "system1": result.get("system1"),
        "createdAt": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    cache.set_prediction(result["truckId"], wire)
    if result["riskScore"] is not None:
        cache.set_risk(result["truckId"], {
            "riskScore": result["riskScore"], "riskLevel": result["riskLevel"], "source": "person4",
        })
    manager.broadcast_threadsafe({"event": "PREDICTION_UPDATED", **wire})

    # Two further frames so the command center can update its recommendation
    # card and its food-loss KPIs without re-fetching.
    created = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    rec = result.get("recommendation") or {}
    manager.broadcast_threadsafe({
        "event": "RECOMMENDATION_UPDATED",
        "truckId": result["truckId"],
        "batchId": result["batchId"],
        "action": rec.get("action"),
        "destinationId": rec.get("destinationId"),
        "etaMinutes": rec.get("etaMinutes"),
        "expectedLossPercent": rec.get("expectedLossPercent"),
        "foodSavedKg": rec.get("foodSavedKg"),
        "reasoning": rec.get("reasoning"),
        "createdAt": created,
    })
    loss = result.get("foodLoss") or {}
    manager.broadcast_threadsafe({
        "event": "FOOD_LOSS_UPDATED",
        "truckId": result["truckId"],
        "batchId": result["batchId"],
        "predictedLossKg": loss.get("predictedLossKg"),
        "lossWithInterventionKg": loss.get("lossWithInterventionKg"),
        "foodSavedKg": loss.get("foodSavedKg"),
        "financialLossPrevented": loss.get("financialLossPrevented"),
        "currency": "QAR",
        "createdAt": created,
    })


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
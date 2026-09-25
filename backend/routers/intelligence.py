"""Person 4 REST surface (the 8 endpoints from the brief).

    GET  /api/predictions/{batchId}
    GET  /api/risk/{batchId}
    POST /api/optimization/evaluate
    GET  /api/optimization/{batchId}
    GET  /api/analytics/food-loss
    GET  /api/analytics/inventory
    POST /api/ai/explain
    GET  /api/recommendations/{batchId}

GETs return the latest stored intelligence result; pass ``?refresh=true`` to
re-run the engine (and the LLM) on demand.
"""
from __future__ import annotations

import datetime as dt

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select

from ..context import build_context
from ..db import session_scope
from ..intelligence import engine, features as features_mod, forecasting, inventory_opt, llm as llm_mod, optimization, spoilage
from ..models import Inventory, Prediction, Product, ProductBatch, Truck

router = APIRouter(prefix="/api", tags=["intelligence"])


# --------------------------------------------------------------------- helpers
def _latest_prediction(session, batch_id: str) -> Prediction | None:
    return session.execute(
        select(Prediction).where(Prediction.batch_id == batch_id)
        .order_by(Prediction.created_at.desc()).limit(1)
    ).scalar_one_or_none()


def _truck_for_batch(session, batch_id: str) -> str | None:
    if session.get(ProductBatch, batch_id) is None:
        return None
    row = session.execute(
        select(Truck.id).where(Truck.current_batch_id == batch_id).limit(1)
    ).first()
    return row[0] if row else None


def _synthesize(record: Prediction) -> dict:
    created = record.created_at
    if created is not None and created.tzinfo is None:
        created = created.replace(tzinfo=dt.timezone.utc)
    return {
        "batchId": record.batch_id,
        "truckId": record.truck_id,
        "thermalExposure": record.thermal_exposure,
        "remainingShelfLifeHours": record.remaining_shelf_life_hours,
        "spoilageProbability": record.spoilage_probability,
        "confidence": record.confidence,
        "riskScore": record.risk_score,
        "riskLevel": record.risk_level,
        "recommendation": record.recommendation,
        "modelVersion": record.model_version,
        "generatedAt": created.strftime("%Y-%m-%dT%H:%M:%SZ") if created else None,
    }


def _resolve(batch_id: str, refresh: bool) -> dict:
    with session_scope() as session:
        record = _latest_prediction(session, batch_id)
        truck_id = _truck_for_batch(session, batch_id)

    if not refresh and record is not None:
        return record.result or _synthesize(record)
    if truck_id is None:
        if record is not None:
            return record.result or _synthesize(record)
        raise HTTPException(status_code=404, detail=f"unknown batch '{batch_id}'")

    result = engine.evaluate_truck(truck_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"unknown batch '{batch_id}'")
    return result


# ------------------------------------------------------------------ predictions
@router.get("/predictions/{batch_id}")
def get_prediction(batch_id: str, refresh: bool = Query(default=False)) -> dict:
    return _resolve(batch_id, refresh)


@router.get("/risk/{batch_id}")
def get_risk(batch_id: str, refresh: bool = Query(default=False)) -> dict:
    result = _resolve(batch_id, refresh)
    return {
        "batchId": result.get("batchId"),
        "truckId": result.get("truckId"),
        "riskScore": result.get("riskScore"),
        "riskLevel": result.get("riskLevel"),
        "riskFactors": result.get("riskFactors"),
        "anomaly": result.get("anomaly"),
        "anomalyType": result.get("anomalyType"),
        "generatedAt": result.get("generatedAt"),
    }


@router.get("/recommendations/{batch_id}")
def get_recommendation(batch_id: str, refresh: bool = Query(default=False)) -> dict:
    result = _resolve(batch_id, refresh)
    return {
        "batchId": result.get("batchId"),
        "truckId": result.get("truckId"),
        "riskLevel": result.get("riskLevel"),
        "recommendation": result.get("recommendation"),
        "reasoning": (result.get("recommendation") or {}).get("reasoning"),
        "generatedAt": result.get("generatedAt"),
    }


# --------------------------------------------------------------- system 1 (Laya)
@router.get("/system1/{truck_id}")
def get_system1(truck_id: str) -> dict:
    """The local Laya System-1 read for a truck, next to the deterministic decision."""
    with session_scope() as session:
        if session.get(Truck, truck_id) is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
    result = engine.evaluate_truck(truck_id, use_llm=False, persist=False)
    if result is None:
        raise HTTPException(status_code=404, detail=f"no data for truck '{truck_id}'")
    system1 = result.get("system1")
    return {
        "truckId": truck_id,
        "batchId": result.get("batchId"),
        "available": system1 is not None,
        "system1": system1,
        "deterministicDecision": result.get("decision"),
        "generatedAt": result.get("generatedAt"),
    }


# ----------------------------------------------------------------- optimization
class OptimizeIn(BaseModel):
    truckId: str | None = None
    batchId: str | None = None


@router.post("/optimization/evaluate")
def optimization_evaluate(body: OptimizeIn) -> dict:
    truck_id = body.truckId
    if truck_id is None and body.batchId:
        with session_scope() as session:
            truck_id = _truck_for_batch(session, body.batchId)
    if not truck_id:
        raise HTTPException(status_code=422, detail="provide truckId or a known batchId")

    with session_scope() as session:
        context = build_context(session, truck_id)
        if context is None:
            raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
        batch = context.get("batch")

    feat = features_mod.compute(context.get("recentTelemetry") or [], batch)
    sp = spoilage.predict(feat, batch)
    return optimization.evaluate(context, feat, sp)


@router.get("/optimization/{batch_id}")
def optimization_for_batch(batch_id: str, refresh: bool = Query(default=False)) -> dict:
    result = _resolve(batch_id, refresh)
    return {
        "batchId": result.get("batchId"),
        "truckId": result.get("truckId"),
        "optimization": result.get("optimization"),
    }


# -------------------------------------------------------------------- analytics

def _collect_food_loss_rows(session) -> tuple[list[dict], list[Prediction]]:
    """Return (latest_per_truck_loss_records, all_prediction_rows_with_loss).

    First return value is the de-duplicated latest-per-truck list used for
    aggregate totals. Second is the raw per-row list (may have dupes) used by
    the series endpoint for time-series grouping.
    """
    rows = session.execute(
        select(Prediction).order_by(Prediction.created_at.desc())
    ).scalars().all()

    seen: set[str] = set()
    latest: list[dict] = []
    all_with_loss: list[Prediction] = []

    for row in rows:
        result = row.result or {}
        loss = result.get("foodLoss")
        if loss:
            all_with_loss.append(row)
        if row.truck_id not in seen:
            seen.add(row.truck_id)
            if loss:
                latest.append({"batchId": row.batch_id, "truckId": row.truck_id,
                                "row": row, **loss})
    return latest, all_with_loss


@router.get("/analytics/food-loss")
def food_loss_analytics() -> dict:
    with session_scope() as session:
        latest, _ = _collect_food_loss_rows(session)

        # Sum transported kg from the batches referenced by latest predictions
        transported_kg = 0.0
        for entry in latest:
            batch = session.get(ProductBatch, entry["batchId"]) if entry["batchId"] else None
            if batch:
                transported_kg += float(batch.quantity_kg)

    at_risk_kg = sum(float(e.get("predictedLossKg") or 0.0) for e in latest)
    lost_kg = sum(float(e.get("lossWithInterventionKg") or 0.0) for e in latest)
    saved_kg = max(0.0, at_risk_kg - lost_kg)
    financial_loss = sum(float(e.get("financialLoss") or 0.0) for e in latest)
    financial_loss_prevented = sum(float(e.get("financialLossPrevented") or 0.0) for e in latest)

    loss_rate = round(lost_kg / transported_kg * 100, 2) if transported_kg > 0 else 0.0
    loss_rate = min(loss_rate, 100.0)
    prevented_pct = round(saved_kg / at_risk_kg * 100, 2) if at_risk_kg > 0 else 0.0
    co2_avoided = round(saved_kg * 2.5, 2)

    batches = [
        {k: v for k, v in e.items() if k != "row"}
        for e in latest
    ]

    return {
        "period": dt.date.today().strftime("%Y-%m"),
        "transportedKg": round(transported_kg, 2),
        "atRiskKg": round(at_risk_kg, 2),
        "lostKg": round(lost_kg, 2),
        "savedKg": round(saved_kg, 2),
        "lossRatePercent": loss_rate,
        "preventedLossPercent": prevented_pct,
        "estimatedFinancialLoss": round(financial_loss, 2),
        "estimatedFinancialLossPrevented": round(financial_loss_prevented, 2),
        "co2AvoidedKg": co2_avoided,
        "batches": batches,
        "currency": "QAR",
        "provenance": "CALCULATED",
    }


@router.get("/analytics/food-loss/series")
def food_loss_series() -> dict:
    with session_scope() as session:
        _, all_rows = _collect_food_loss_rows(session)

        over_time: dict[str, dict] = {}
        by_cause: dict[str, float] = {}
        by_product: dict[str, float] = {}
        by_warehouse: dict[str, float] = {}

        for row in all_rows:
            result = row.result or {}
            loss = result.get("foodLoss") or {}
            lost = float(loss.get("lossWithInterventionKg") or 0.0)
            predicted = float(loss.get("predictedLossKg") or 0.0)

            # overTime
            created = row.created_at
            if created is not None and created.tzinfo is None:
                created = created.replace(tzinfo=dt.timezone.utc)
            date_str = created.date().isoformat() if created else "unknown"
            if date_str not in over_time:
                over_time[date_str] = {"lostKg": 0.0, "predictedLostKg": 0.0}
            over_time[date_str]["lostKg"] += lost
            over_time[date_str]["predictedLostKg"] += predicted

            # byCause
            cause = result.get("anomalyType") or "Unknown"
            by_cause[cause] = by_cause.get(cause, 0.0) + lost

            # byProduct
            batch = session.get(ProductBatch, row.batch_id) if row.batch_id else None
            if batch:
                product = session.get(Product, batch.product_id)
                product_name = product.name if product else (batch.product_id or "Unknown")
            else:
                product_name = "Unknown"
            by_product[product_name] = by_product.get(product_name, 0.0) + lost

            # byWarehouse
            rec = result.get("recommendation") or {}
            dest = rec.get("destinationId") or "Unknown"
            by_warehouse[dest] = by_warehouse.get(dest, 0.0) + lost

    return {
        "overTime": [
            {"date": d, "lostKg": round(v["lostKg"], 2), "predictedLostKg": round(v["predictedLostKg"], 2)}
            for d, v in sorted(over_time.items())
        ],
        "byCause": [
            {"label": k, "lostKg": round(v, 2)}
            for k, v in sorted(by_cause.items(), key=lambda x: -x[1])
        ],
        "byProduct": [
            {"label": k, "lostKg": round(v, 2)}
            for k, v in sorted(by_product.items(), key=lambda x: -x[1])
        ],
        "byWarehouse": [
            {"label": k, "lostKg": round(v, 2)}
            for k, v in sorted(by_warehouse.items(), key=lambda x: -x[1])
        ],
    }


@router.get("/analytics/scenario-comparison/{scenario}")
def scenario_comparison(scenario: str) -> dict:
    with session_scope() as session:
        rows = session.execute(
            select(Prediction).order_by(Prediction.created_at.desc())
        ).scalars().all()

    seen: set[str] = set()
    without_pcts: list[float] = []
    with_pcts: list[float] = []
    food_saved_kg = 0.0
    financial_saved = 0.0

    for row in rows:
        if row.truck_id in seen:
            continue
        seen.add(row.truck_id)
        result = row.result or {}
        sp = result.get("spoilageProbability")
        if sp is not None:
            without_pcts.append(float(sp) * 100.0)
        dec = result.get("decision") or {}
        exp_loss = dec.get("expectedLossPercent")
        if exp_loss is not None:
            with_pcts.append(float(exp_loss))
        loss = result.get("foodLoss") or {}
        food_saved_kg += float(loss.get("foodSavedKg") or 0.0)
        financial_saved += float(loss.get("financialLossPrevented") or 0.0)

    # No predictions yet: report honestly rather than inventing a headline
    # number. The UI shows an empty state until the engine has run.
    if not without_pcts:
        return {
            "scenario": scenario.upper(),
            "available": False,
            "withoutInterventionLossPercent": None,
            "withOptimizationLossPercent": None,
            "foodSavedKg": 0.0,
            "financialSavedQar": 0.0,
            "currency": "QAR",
            "provenance": "OPTIMIZED",
        }

    avg_without = round(sum(without_pcts) / len(without_pcts), 2)
    avg_with = round(sum(with_pcts) / len(with_pcts), 2) if with_pcts else avg_without

    return {
        "scenario": scenario.upper(),
        "available": True,
        "withoutInterventionLossPercent": avg_without,
        "withOptimizationLossPercent": avg_with,
        "foodSavedKg": round(food_saved_kg, 2),
        "financialSavedQar": round(financial_saved, 2),
        "currency": "QAR",
        "provenance": "OPTIMIZED",
    }


@router.get("/analytics/inventory")
def inventory_analytics(days: int = Query(default=3, ge=1, le=14)) -> dict:
    with session_scope() as session:
        items = session.execute(select(Inventory).order_by(Inventory.batch_id)).scalars().all()
        entries = []
        totals = {"inventoryKg": 0.0, "forecastDemandKg": 0.0, "expectedExcessKg": 0.0}
        for item in items:
            batch = session.get(ProductBatch, item.batch_id)
            shelf_life_days = 7
            if batch and batch.initial_shelf_life_hours:
                shelf_life_days = max(1, round(batch.initial_shelf_life_hours / 24))
            days_to_expiry = None
            if item.expiry_date:
                days_to_expiry = (item.expiry_date - dt.date.today()).days
            fc = forecasting.forecast(item.batch_id, item.quantity_kg, days=days,
                                      shelf_life_days=shelf_life_days)
            rec = inventory_opt.recommend(item.quantity_kg, fc["forecastDemandKg"],
                                          days_to_expiry, item.location_type)
            totals["inventoryKg"] += float(item.quantity_kg)
            totals["forecastDemandKg"] += fc["forecastDemandKg"]
            totals["expectedExcessKg"] += rec["expectedExcessKg"]
            entries.append({
                "id": item.id,
                "batchId": item.batch_id,
                "product": batch.product_id if batch else None,
                "locationType": item.location_type,
                "locationId": item.location_id,
                "quantityKg": item.quantity_kg,
                "daysToExpiry": days_to_expiry,
                "forecast": fc["forecast"],
                "forecastDemandKg": fc["forecastDemandKg"],
                "expectedExcessKg": rec["expectedExcessKg"],
                "recommendedAction": rec["action"],
                "reason": rec["reason"],
            })

    return {"totals": {k: round(v, 1) for k, v in totals.items()}, "items": entries}


# ------------------------------------------------------------------------- AI
class ExplainIn(BaseModel):
    truckId: str | None = None
    batchId: str | None = None
    facts: dict | None = None
    question: str | None = None


@router.post("/ai/explain")
def ai_explain(body: ExplainIn) -> dict:
    facts = body.facts
    if facts is None:
        if body.truckId:
            with session_scope() as session:
                context = build_context(session, body.truckId, 60)
            if context is None:
                raise HTTPException(status_code=404, detail=f"unknown truck '{body.truckId}'")
            facts = engine.evaluate_context(context, use_llm=False)
        elif body.batchId:
            facts = _resolve(body.batchId, refresh=False)
        else:
            raise HTTPException(status_code=422, detail="provide facts, truckId or batchId")

    # Only structured facts are ever given to the model.
    client = llm_mod.get_client()
    if client.available:
        system = (
            "You are the cold-chain explainer. Explain the situation using ONLY the supplied "
            "facts and recommend an action. Never invent numbers. Reply as JSON: "
            '{"explanation": "<plain language>", "action": "<CONTINUE|MONITOR|'
            'PREPARE_INTERVENTION|DIVERT|TRANSFER|DISCOUNT|PRIORITIZE_SALE|REDISTRIBUTE>"}.'
        )
        reply = client.complete_json(system, str(facts))
        if reply:
            return {"source": "explainer", "modelVersion": client.model,
                    "explanation": reply.get("explanation"), "action": reply.get("action"),
                    "facts": facts}

    explanation = _template_explanation(facts)
    return {"source": "template", "modelVersion": "template-1",
            "explanation": explanation,
            "action": (facts.get("recommendation") or {}).get("action")
            or (facts.get("decision") or {}).get("action"),
            "facts": facts}


def _template_explanation(facts: dict) -> str:
    batch = facts.get("batchId") or "the batch"
    temp = facts.get("temperatureC", (facts.get("features") or {}).get("latestTemperatureC"))
    risk = facts.get("riskLevel", "unknown")
    spoilage = facts.get("spoilageProbability")
    shelf = facts.get("remainingShelfLifeHours")
    action = (facts.get("recommendation") or {}).get("action") or (facts.get("decision") or {}).get("action")
    parts = [f"Batch {batch} is at risk level {risk}."]
    if temp is not None:
        parts.append(f"Latest temperature {temp} C.")
    if spoilage is not None:
        parts.append(f"Estimated spoilage probability {round(float(spoilage) * 100)}%.")
    if shelf is not None:
        parts.append(f"About {round(float(shelf), 1)} h of shelf life remain.")
    if action:
        parts.append(f"Recommended action: {action}.")
    return " ".join(parts)
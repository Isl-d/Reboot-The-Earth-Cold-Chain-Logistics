"""Model-chain endpoints for the frontend intelligence panel.

    GET /api/model/{truckId}/thermal-exposure
    GET /api/model/{truckId}/deterioration
    GET /api/model/{truckId}/spoilage

Each endpoint runs evaluate_truck (no LLM, no DB write) and returns the
relevant slice of the result so the frontend can render the model chain cards.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException

from ..db import session_scope
from ..intelligence import engine
from ..models import Truck

router = APIRouter(prefix="/api/model", tags=["model"])


def _evaluate(truck_id: str) -> dict:
    """Run the model chain for truck_id. Returns None → 404."""
    with session_scope() as session:
        truck = session.get(Truck, truck_id)
    if truck is None:
        raise HTTPException(status_code=404, detail=f"unknown truck '{truck_id}'")
    result = engine.evaluate_truck(truck_id, use_llm=False, persist=False)
    if result is None:
        raise HTTPException(status_code=404, detail=f"no data for truck '{truck_id}'")
    return result


@router.get("/{truck_id}/thermal-exposure")
def thermal_exposure(truck_id: str) -> dict:
    result = _evaluate(truck_id)
    feat = result.get("features") or {}
    return {
        "safeTemperatureC": feat.get("safeMaxTempC"),
        "currentTemperatureC": result.get("temperatureC"),
        "exposureMinutes": result.get("exposureMinutes"),
        "thermalExposure": result.get("thermalExposure"),
        "unit": "C*min",
        "provenance": "CALCULATED",
    }


@router.get("/{truck_id}/deterioration")
def deterioration(truck_id: str) -> dict:
    result = _evaluate(truck_id)
    return {
        "deteriorationFraction": result.get("deteriorationFraction"),
        "remainingShelfLifeHours": result.get("remainingShelfLifeHours"),
        "confidence": result.get("confidence"),
        "provenance": "CALCULATED",
    }


@router.get("/{truck_id}/spoilage")
def spoilage(truck_id: str) -> dict:
    result = _evaluate(truck_id)
    return {
        "spoilageProbability": result.get("spoilageProbability"),
        "confidence": result.get("confidence"),
        "modelVersion": result.get("modelVersion"),
        "provenance": "PREDICTED",
    }

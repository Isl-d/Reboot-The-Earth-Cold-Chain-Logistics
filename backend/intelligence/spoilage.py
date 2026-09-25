"""Spoilage probability (Person 4 §4), LLM-assisted but code-guarded.

A deterministic prior is computed from the exposure/deterioration features.
The LLM may adjust that estimate only within ``settings.llm_probability_band``,
so a hallucinated number can never swing the result. With no key or no network
the prior is returned unchanged and clearly labelled ``heuristic``.
"""
from __future__ import annotations

import json
import math

from ..config import settings
from . import llm as llm_mod

SYSTEM = (
    "You are a cold-chain food-safety reasoning assistant. You receive "
    "deterministic, code-computed facts about one product batch. Estimate the "
    "spoilage probability and your confidence, and briefly explain. Never "
    "invent sensor readings, temperatures, shelf-life values or quantities. "
    "Reply ONLY as JSON: "
    '{"spoilageProbability": <0..1>, "confidence": <0..1>, "rationale": "<one or two sentences>"}.'
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def deterministic_prior(features: dict) -> float:
    """Saturating exposure-response prior.

    Two independent signals blend into the prior: the shelf life already spent
    (deterioration) and the thermal exposure accumulated above the safe
    maximum. Exposure uses a saturating curve with a configurable E50, so a
    sustained excursion can raise the estimate even while deterioration is
    still small. Both parameters are prototype calibrations, not certified
    food-safety thresholds.
    """
    deterioration = float(features.get("deteriorationFraction") or 0.0)
    exposure = float(features.get("thermalExposure") or 0.0)
    base = 1.0 - math.exp(-3.0 * deterioration)
    e50 = settings.spoilage_exposure_e50_cmin or 15.0
    exposure_term = 1.0 - math.exp(-exposure / e50)
    return _clamp(
        settings.spoilage_base_weight * base
        + settings.spoilage_exposure_weight * exposure_term,
        0.0,
        1.0,
    )


def deterministic_confidence(features: dict) -> float:
    samples = features.get("readings") or 0
    return _clamp(0.35 + 0.5 * min(1.0, float(samples) / 40.0), 0.0, 1.0)


def predict(features: dict, batch: dict | None, client=None, use_llm: bool = True) -> dict:
    prior = deterministic_prior(features)
    confidence = deterministic_confidence(features)
    result = {
        "spoilageProbability": round(prior, 4),
        "confidence": round(confidence, 4),
        "source": "heuristic",
        "modelVersion": "heuristic-1",
        "rationale": None,
    }

    client = client if client is not None else llm_mod.get_client()
    if not (use_llm and client is not None and client.available):
        return result

    batch = batch or {}
    facts = {
        "product": batch.get("product"),
        "safeTempCMin": features.get("safeMinTempC"),
        "safeTempCMax": features.get("safeMaxTempC"),
        "latestTemperatureC": features.get("latestTemperatureC"),
        "thermalExposureCmin": features.get("thermalExposure"),
        "exposureMinutes": features.get("exposureMinutes"),
        "deteriorationFraction": features.get("deteriorationFraction"),
        "remainingShelfLifeHours": features.get("remainingShelfLifeHours"),
        "initialShelfLifeHours": features.get("initialShelfLifeHours"),
        "deterministicPrior": round(prior, 4),
        "readings": features.get("readings"),
    }
    reply = client.complete_json(SYSTEM, json.dumps(facts))
    if not reply or "spoilageProbability" not in reply:
        return result

    try:
        raw = float(reply["spoilageProbability"])
    except (TypeError, ValueError):
        return result

    band = settings.llm_probability_band
    guarded = _clamp(raw, _clamp(prior - band, 0.0, 1.0), _clamp(prior + band, 0.0, 1.0))
    try:
        confidence = _clamp(float(reply.get("confidence", confidence)), 0.0, 1.0)
    except (TypeError, ValueError):
        confidence = deterministic_confidence(features)

    rationale = reply.get("rationale")
    return {
        "spoilageProbability": round(guarded, 4),
        "confidence": round(confidence, 4),
        "source": "explainer",
        "modelVersion": client.model,
        "rationale": (str(rationale)[:500] if rationale else None),
    }
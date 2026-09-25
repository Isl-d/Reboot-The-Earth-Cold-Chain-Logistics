"""Warehouse diversion optimization (Person 4 §7).

Deterministic candidate enumeration and objective, exactly as the brief
requires::

    min( C_transport + C_foodloss + C_delay )

subject to ETA ≤ remaining safe time, quantity ≤ available capacity, and the
warehouse temperature envelope containing the product's required range. The
LLM may *rank* the feasible candidates and explain the choice, but the code
recomputes and validates the selection; an infeasible pick is rejected.
"""
from __future__ import annotations

import json

from ..config import settings
from ..geo import haversine_km
from . import llm as llm_mod

SYSTEM = (
    "You are a cold-chain logistics assistant. You are given a list of "
    "already-computed, already-feasibility-checked warehouse options with their "
    "costs and ETAs. Choose the best feasible option and explain briefly. Never "
    "invent warehouses, distances, costs or ETAs. Reply ONLY as JSON: "
    '{"selectedWarehouseId": "<id>", "rationale": "<one or two sentences>"}.'
)


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _eta_minutes(distance_km: float, speed_kmh: float) -> float:
    speed = speed_kmh if speed_kmh and speed_kmh > 0.5 else settings.average_speed_kmh
    return distance_km / speed * 60.0


def evaluate(context: dict, features: dict, spoilage: dict,
             client=None, use_llm: bool = True) -> dict:
    truck = context.get("truck") or {}
    batch = context.get("batch") or {}
    candidates_in = context.get("candidateWarehouses") or []

    lat, lon = truck.get("latitude"), truck.get("longitude")
    speed = truck.get("speedKmh") or 0.0
    quantity = float(batch.get("quantityKg") or 0.0)
    value_per_kg = float(batch.get("valuePerKg") or 0.0)
    safe_min = float(batch.get("safeMinTempC", 0.0))
    safe_max = float(batch.get("safeMaxTempC", 4.0))
    remaining_safe_min = float(features.get("remainingShelfLifeHours") or 0.0) * 60.0
    deterioration = float(features.get("deteriorationFraction") or 0.0)
    spoilage_prob = float(spoilage.get("spoilageProbability") or 0.0)

    candidates: list[dict] = []
    for warehouse in candidates_in:
        distance = None
        eta = None
        if lat is not None and lon is not None:
            distance = haversine_km(float(lat), float(lon),
                                    float(warehouse["latitude"]), float(warehouse["longitude"]))
            eta = _eta_minutes(distance, float(speed))
        distance = distance if distance is not None else 0.0
        eta = eta if eta is not None else 0.0

        temp_ok = not (float(warehouse["maxTempC"]) < safe_min
                       or float(warehouse["minTempC"]) > safe_max)
        capacity_ok = quantity <= float(warehouse.get("availableCapacityKg") or 0.0)
        time_ok = eta <= remaining_safe_min
        feasible = temp_ok and capacity_ok and time_ok

        transit_deterioration = deterioration + settings.transit_loss_rate_per_min * eta
        projected_loss = _clamp(transit_deterioration + 0.25 * spoilage_prob, 0.0, 1.0)
        transport_cost = distance * settings.transport_cost_per_km
        food_loss_cost = quantity * projected_loss * value_per_kg
        delay_cost = eta * settings.delay_cost_per_min
        objective = transport_cost + food_loss_cost + delay_cost

        reasons = []
        if not temp_ok:
            reasons.append("temperature envelope does not match the product")
        if not capacity_ok:
            reasons.append("insufficient available capacity")
        if not time_ok:
            reasons.append("ETA exceeds remaining safe time")

        candidates.append({
            "warehouseId": warehouse["id"],
            "name": warehouse.get("name"),
            "distanceKm": round(distance, 3),
            "etaMinutes": round(eta, 1),
            "expectedLossPercent": round(projected_loss * 100.0, 2),
            "transportCost": round(transport_cost, 2),
            "foodLossCost": round(food_loss_cost, 2),
            "delayCost": round(delay_cost, 2),
            "objective": round(objective, 3),
            "feasible": feasible,
            "infeasibleReason": "; ".join(reasons) or None,
        })

    feasible = [c for c in candidates if c["feasible"]]
    pool = feasible or candidates
    best = min(pool, key=lambda c: c["objective"]) if pool else None

    result = {
        "candidates": candidates,
        "selectedWarehouseId": best["warehouseId"] if best else None,
        "objectiveValue": best["objective"] if best else None,
        "feasible": bool(feasible),
        "source": "deterministic",
        "provenance": "OPTIMIZED",
        "rationale": None,
    }

    client = client if client is not None else llm_mod.get_client()
    if feasible and use_llm and client is not None and client.available:
        facts = {
            "product": batch.get("product"),
            "quantityKg": quantity,
            "remainingSafeMinutes": round(remaining_safe_min, 1),
            "candidateActions": [c["warehouseId"] for c in feasible] + ["CONTINUE"],
            "options": [
                {k: c[k] for k in ("warehouseId", "etaMinutes", "expectedLossPercent",
                                   "transportCost", "foodLossCost", "objective")}
                for c in feasible
            ],
        }
        reply = client.complete_json(SYSTEM, json.dumps(facts))
        if reply:
            chosen = reply.get("selectedWarehouseId")
            valid = {c["warehouseId"] for c in feasible}
            if chosen in valid:
                result["selectedWarehouseId"] = chosen
                result["objectiveValue"] = next(
                    c["objective"] for c in feasible if c["warehouseId"] == chosen
                )
                result["source"] = "explainer"
                result["rationale"] = str(reply.get("rationale") or "")[:500] or None

    return result
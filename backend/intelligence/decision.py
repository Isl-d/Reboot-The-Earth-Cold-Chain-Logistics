"""Deterministic decision engine (Person 4 §11).

Risk + shelf life + spoilage + optimization feasibility -> one action. The LLM
writes the explanation; it never chooses the action.
"""
from __future__ import annotations

CONTINUE = "CONTINUE"
MONITOR = "MONITOR"
PREPARE_INTERVENTION = "PREPARE_INTERVENTION"
DIVERT = "DIVERT"


def decide(risk: dict, features: dict, spoilage: dict, optimization: dict) -> dict:
    level = (risk or {}).get("riskLevel") or "LOW"
    feasible = bool(optimization.get("feasible"))
    destination = optimization.get("selectedWarehouseId")

    if feasible and destination and level in {"HIGH", "CRITICAL"}:
        action = DIVERT
    elif level == "CRITICAL":
        action = PREPARE_INTERVENTION
    elif level == "HIGH":
        action = PREPARE_INTERVENTION
    elif level == "MEDIUM":
        action = MONITOR
    else:
        action = CONTINUE

    candidate = None
    if destination:
        candidate = next(
            (c for c in optimization.get("candidates", [])
             if c.get("warehouseId") == destination), None
        )

    return {
        "action": action,
        "destinationId": destination if action == DIVERT else None,
        "etaMinutes": candidate.get("etaMinutes") if candidate else None,
        "expectedLossPercent": candidate.get("expectedLossPercent") if candidate else None,
    }
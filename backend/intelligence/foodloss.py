"""Food-loss engine (Person 4 §10).

    FoodSaved = ExpectedLoss(without intervention) - ExpectedLoss(with intervention)

All in kilograms and currency; the LLM never touches these numbers.
"""
from __future__ import annotations


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def compute(batch: dict | None, features: dict, spoilage: dict,
            optimization: dict, cause: str | None = None) -> dict:
    batch = batch or {}
    quantity = float(batch.get("quantityKg") or 0.0)
    value_per_kg = float(batch.get("valuePerKg") or 0.0)
    deterioration = float(features.get("deteriorationFraction") or 0.0)
    spoilage_prob = float(spoilage.get("spoilageProbability") or 0.0)

    # Loss if nothing is done: deterioration already accrued plus a share of
    # the spoilage probability.
    loss_without = _clamp(deterioration + 0.30 * spoilage_prob)

    # Loss if the selected (feasible) diversion is taken. Diverting can never
    # be worse than doing nothing, so take the lower of "continue as-is" and
    # the transit cost of the selected option.
    loss_with = loss_without
    selected = optimization.get("selectedWarehouseId")
    if selected and optimization.get("feasible"):
        for candidate in optimization.get("candidates", []):
            if candidate.get("warehouseId") == selected:
                transit_loss = _clamp(float(candidate.get("expectedLossPercent") or 0.0) / 100.0)
                loss_with = min(loss_without, transit_loss)
                break

    predicted_loss_kg = quantity * loss_without
    loss_with_kg = quantity * loss_with
    food_saved_kg = max(0.0, predicted_loss_kg - loss_with_kg)

    return {
        "predictedLossKg": round(predicted_loss_kg, 2),
        "lossWithInterventionKg": round(loss_with_kg, 2),
        "foodSavedKg": round(food_saved_kg, 2),
        "financialLoss": round(predicted_loss_kg * value_per_kg, 2),
        "financialLossPrevented": round(food_saved_kg * value_per_kg, 2),
        "lossCause": cause,
    }
"""Inventory optimization (Person 4 §8).

    ExpectedExcess = Inventory - ForecastDemand

and a documented action for each case. Deterministic.
"""
from __future__ import annotations

CONTINUE = "CONTINUE"
TRANSFER = "TRANSFER"
DISCOUNT = "DISCOUNT"
PRIORITIZE_SALE = "PRIORITIZE_SALE"
REDISTRIBUTE = "REDISTRIBUTE"


def recommend(quantity_kg: float, forecast_demand_kg: float,
              days_to_expiry: int | None, location_type: str = "warehouse") -> dict:
    quantity = float(quantity_kg)
    excess = quantity - float(forecast_demand_kg)

    if quantity <= 0:
        action, reason = CONTINUE, "no stock at this location"
    elif days_to_expiry is not None and days_to_expiry <= 1:
        action, reason = DISCOUNT, "expires within a day; sell down now"
    elif excess <= 0:
        action, reason = CONTINUE, "forecast demand covers the inventory"
    elif excess > 0.5 * quantity:
        action = TRANSFER if location_type == "warehouse" else REDISTRIBUTE
        reason = "more than half the stock is excess; move it to demand"
    else:
        action, reason = PRIORITIZE_SALE, "a small surplus; prioritise sale"

    return {
        "action": action,
        "expectedExcessKg": round(max(0.0, excess), 1),
        "reason": reason,
    }
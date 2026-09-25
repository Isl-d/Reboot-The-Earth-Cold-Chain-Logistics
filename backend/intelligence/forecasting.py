"""Demand forecasting baseline (Person 4 §9).

A strong deterministic baseline first: spread the batch over its remaining
shelf life and modulate by day of week. No training, no black box — documented
and swappable for a learned model later.
"""
from __future__ import annotations

import datetime as dt

# Monday..Sunday relative demand multipliers.
_WEEKLY = (1.00, 0.95, 1.00, 1.05, 1.15, 1.25, 1.10)


def forecast(batch_id: str, quantity_kg: float, days: int = 3,
             start: dt.date | None = None, shelf_life_days: int = 7) -> dict:
    start = start or dt.date.today()
    horizon = max(1, shelf_life_days)
    base_daily = float(quantity_kg) / horizon

    series = []
    total_demand = 0.0
    for offset in range(days):
        date = start + dt.timedelta(days=offset)
        demand = round(base_daily * _WEEKLY[date.weekday()], 1)
        total_demand += demand
        series.append({"date": date.isoformat(), "demandKg": demand})

    return {
        "batchId": batch_id,
        "forecast": series,
        "forecastDemandKg": round(total_demand, 1),
        "expectedExcessKg": round(max(0.0, float(quantity_kg) - total_demand), 1),
    }
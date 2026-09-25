"""Person 4 model chain: anomaly, spoilage guardrails, optimization, food loss,
decision, and the unified engine response."""
from __future__ import annotations

import datetime as dt

from backend.intelligence import (
    anomaly,
    decision,
    engine,
    features,
    foodloss,
    forecasting,
    inventory_opt,
    optimization,
    spoilage,
)

BATCH = {
    "id": "CHK-1029",
    "product": "Fresh Chicken",
    "safeMinTempC": 0.0,
    "safeMaxTempC": 4.0,
    "idealTempC": 2.0,
    "initialShelfLifeHours": 168.0,
    "activationEnergyJMol": 90000.0,
    "humidityLimitPct": 90.0,
    "quantityKg": 500.0,
    "valuePerKg": 20.0,
}

WAREHOUSES = [
    {"id": "WH01", "name": "Close", "latitude": 25.30, "longitude": 51.50,
     "availableCapacityKg": 1200.0, "minTempC": 0.0, "maxTempC": 4.0},
    {"id": "WH02", "name": "Far", "latitude": 25.60, "longitude": 51.60,
     "availableCapacityKg": 1200.0, "minTempC": 0.0, "maxTempC": 4.0},
]


class FakeLLM:
    def __init__(self, reply=None, model="fake-model"):
        self.reply = reply
        self.model = model
        self.available = True

    def complete_json(self, system, user, max_tokens=None):
        return self.reply


class OfflineLLM:
    available = False
    model = "offline"

    def complete_json(self, system, user, max_tokens=None):
        raise AssertionError("must not be called when unavailable")


def _reading(ts, temp, **over):
    base = {
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp, "humidityPct": 74.0,
        "latitude": 25.2854, "longitude": 51.531,
        "speedKmh": 42.0, "gForce": 0.2, "doorOpen": False, "refrigerationOn": True,
    }
    base.update(over)
    return base


def _t0():
    return dt.datetime(2026, 9, 24, 12, 0, tzinfo=dt.timezone.utc)


# ------------------------------------------------------------------- anomaly
def test_zscore_flags_a_sudden_temperature_rise():
    t0 = _t0()
    telemetry = [_reading(t0 + dt.timedelta(minutes=i), 2.0) for i in range(9)]
    telemetry.append(_reading(t0 + dt.timedelta(minutes=9), 20.0))
    feat = features.compute(telemetry, BATCH)
    out = anomaly.detect(telemetry, feat, BATCH)
    assert out["anomaly"] is True
    assert out["type"] in {"TEMPERATURE_RISE", "TEMPERATURE_DROP"}


def test_refrigeration_off_is_an_anomaly():
    t0 = _t0()
    telemetry = [_reading(t0, 3.0, refrigerationOn=False)]
    feat = features.compute(telemetry, BATCH)
    out = anomaly.detect(telemetry, feat, BATCH)
    assert out["type"] == "REFRIGERATION_BEHAVIOR"


def test_steady_window_has_no_anomaly():
    t0 = _t0()
    telemetry = [_reading(t0 + dt.timedelta(minutes=i), 3.0) for i in range(8)]
    feat = features.compute(telemetry, BATCH)
    assert anomaly.detect(telemetry, feat, BATCH)["anomaly"] is False


# ------------------------------------------------------------------ spoilage
def test_heuristic_spoilage_rises_with_deterioration():
    low = spoilage.deterministic_prior({"deteriorationFraction": 0.05, "thermalExposure": 0})
    high = spoilage.deterministic_prior({"deteriorationFraction": 0.60, "thermalExposure": 40})
    assert low < high


def test_offline_uses_heuristic():
    feat = {"deteriorationFraction": 0.1, "thermalExposure": 5, "readings": 10}
    out = spoilage.predict(feat, BATCH, client=OfflineLLM())
    assert out["source"] == "heuristic"
    assert 0.0 <= out["spoilageProbability"] <= 1.0


def test_llm_estimate_is_clamped_to_the_band():
    feat = {"deteriorationFraction": 0.02, "thermalExposure": 0, "readings": 10}
    prior = spoilage.deterministic_prior(feat)
    out = spoilage.predict(feat, BATCH, client=FakeLLM(
        {"spoilageProbability": 0.99, "confidence": 5, "rationale": "very risky"}))
    assert out["source"] == "explainer"
    assert out["spoilageProbability"] <= prior + 0.35 + 1e-3
    assert out["confidence"] == 1.0  # clamped


# ------------------------------------------------------------- optimization
def _context(speed=42.0, warehouses=None, lat=25.2854, lon=51.531):
    return {
        "truck": {"id": "T102", "latitude": lat, "longitude": lon, "speedKmh": speed},
        "batch": BATCH,
        "recentTelemetry": [],
        "candidateWarehouses": warehouses if warehouses is not None else WAREHOUSES,
        "derived": {},
    }


def test_optimization_prefers_the_nearer_feasible_warehouse():
    feat = features.compute([], BATCH)
    sp = spoilage.predict(feat, BATCH, client=OfflineLLM())
    out = optimization.evaluate(_context(), feat, sp, client=OfflineLLM())
    assert out["feasible"] is True
    assert out["selectedWarehouseId"] == "WH01"
    assert all(c["feasible"] for c in out["candidates"])


def test_short_capacity_marks_a_warehouse_infeasible():
    warehouses = [
        {"id": "WH01", "latitude": 25.30, "longitude": 51.50,
         "availableCapacityKg": 10.0, "minTempC": 0.0, "maxTempC": 4.0},
    ]
    feat = features.compute([], BATCH)
    sp = spoilage.predict(feat, BATCH, client=OfflineLLM())
    out = optimization.evaluate(_context(warehouses=warehouses), feat, sp, client=OfflineLLM())
    assert out["feasible"] is False
    assert out["candidates"][0]["feasible"] is False
    assert "capacity" in out["candidates"][0]["infeasibleReason"]


def test_temperature_mismatch_marks_infeasible():
    warehouses = [
        {"id": "WH01", "latitude": 25.30, "longitude": 51.50,
         "availableCapacityKg": 1200.0, "minTempC": 20.0, "maxTempC": 25.0},
    ]
    feat = features.compute([], BATCH)
    sp = spoilage.predict(feat, BATCH, client=OfflineLLM())
    out = optimization.evaluate(_context(warehouses=warehouses), feat, sp, client=OfflineLLM())
    assert out["candidates"][0]["feasible"] is False


def test_llm_may_not_pick_an_infeasible_warehouse():
    feat = features.compute([], BATCH)
    sp = spoilage.predict(feat, BATCH, client=OfflineLLM())
    out = optimization.evaluate(_context(), feat, sp, client=FakeLLM({"selectedWarehouseId": "WH99"}))
    assert out["source"] == "deterministic"
    assert out["selectedWarehouseId"] == "WH01"


def test_llm_can_pick_a_feasible_alternative():
    feat = features.compute([], BATCH)
    sp = spoilage.predict(feat, BATCH, client=OfflineLLM())
    out = optimization.evaluate(_context(), feat, sp, client=FakeLLM(
        {"selectedWarehouseId": "WH02", "rationale": "closer to the store"}))
    assert out["source"] == "explainer"
    assert out["selectedWarehouseId"] == "WH02"


# ----------------------------------------------------------------- food loss
def test_food_saved_is_never_negative():
    feat = features.compute([], BATCH)
    sp = {"spoilageProbability": 0.9, "confidence": 0.8}
    opt = {"feasible": True, "selectedWarehouseId": "WH01",
           "candidates": [{"warehouseId": "WH01", "expectedLossPercent": 2.0}]}
    out = foodloss.compute(BATCH, feat, sp, opt)
    assert out["foodSavedKg"] >= 0.0
    assert out["predictedLossKg"] == 500.0 * 0.9  # deterioration 0 + spoilage 0.9
    assert out["lossWithInterventionKg"] == 500.0 * 0.02  # capped at transit loss


def test_no_feasible_option_means_no_saving():
    feat = features.compute([], BATCH)
    sp = {"spoilageProbability": 0.5, "confidence": 0.8}
    out = foodloss.compute(BATCH, feat, sp, {"feasible": False, "selectedWarehouseId": None})
    assert out["foodSavedKg"] == 0.0


# ----------------------------------------------------------------- decision
def test_decision_diverts_only_when_feasible_and_high_risk():
    opt = {"feasible": True, "selectedWarehouseId": "WH01",
           "candidates": [{"warehouseId": "WH01", "etaMinutes": 10, "expectedLossPercent": 2.0}]}
    assert decision.decide({"riskLevel": "CRITICAL"}, {}, {}, opt)["action"] == "DIVERT"
    assert decision.decide({"riskLevel": "LOW"}, {}, {}, opt)["action"] == "CONTINUE"
    assert decision.decide({"riskLevel": "MEDIUM"}, {}, {}, opt)["action"] == "MONITOR"
    infeasible = {"feasible": False, "selectedWarehouseId": None, "candidates": []}
    assert decision.decide({"riskLevel": "CRITICAL"}, {}, {}, infeasible)["action"] == "PREPARE_INTERVENTION"


# ------------------------------------------------------------------ forecast
def test_forecast_and_inventory_actions():
    fc = forecasting.forecast("CHK-1029", 500.0, days=3, shelf_life_days=7)
    assert len(fc["forecast"]) == 3
    assert fc["forecastDemandKg"] > 0
    assert inventory_opt.recommend(0.0, 0.0, 3)["action"] == "CONTINUE"
    assert inventory_opt.recommend(500.0, 100.0, 0)["action"] == "DISCOUNT"
    assert inventory_opt.recommend(500.0, 100.0, 5)["action"] == "TRANSFER"
    assert inventory_opt.recommend(100.0, 90.0, 5)["action"] == "PRIORITIZE_SALE"


# -------------------------------------------------------------------- engine
def test_engine_returns_the_unified_contract():
    t0 = _t0()
    telemetry = [_reading(t0 + dt.timedelta(minutes=i), 8.0, refrigerationOn=False) for i in range(10)]
    context = _context()
    context["recentTelemetry"] = telemetry
    result = engine.evaluate_context(context, use_llm=False, client=OfflineLLM())

    for key in ("batchId", "truckId", "thermalExposure", "deteriorationFraction",
                "remainingShelfLifeHours", "spoilageProbability", "confidence",
                "riskScore", "riskLevel", "anomaly", "recommendation", "optimization",
                "foodLoss", "decision"):
        assert key in result, key

    assert result["riskLevel"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert 0 <= result["riskScore"] <= 100
    assert result["recommendation"]["action"] in {
        "CONTINUE", "MONITOR", "PREPARE_INTERVENTION", "DIVERT"}
    assert result["optimization"]["selectedWarehouseId"] in {"WH01", "WH02", None}
"""Laya (System 1) integration: parsing, fail-safety, and the engine hook.

No network and no weights: a fake client stands in for ``laya-serve``, exactly
like the fake LLM in ``test_intelligence_api.py``.
"""
from __future__ import annotations

from backend.config import settings
from backend.intelligence import engine, laya as laya_mod

CONTEXT = {
    "truck": {"routeId": "R1"},
    "batch": {"product": "Fresh Chicken", "quantityKg": 500,
              "safeMinTempC": 0, "safeMaxTempC": 4},
}

RESULT = {
    "temperatureC": 7.2,
    "thermalExposure": 42.8,
    "exposureMinutes": 30.0,
    "deteriorationFraction": 0.18,
    "remainingShelfLifeHours": 38.0,
    "spoilageProbability": 0.73,
    "riskScore": 78,
    "riskLevel": "HIGH",
    "anomaly": True,
    "anomalyType": "REFRIGERATION_BEHAVIOR",
    "routeDelayMinutes": 0.0,
    "features": {"avgSpeedKmh": 42.0},
    "optimization": {"candidates": [
        {"warehouseId": "WH01", "etaMinutes": 12, "feasible": True,
         "expectedLossPercent": 4.1}]},
    "decision": {"action": "DIVERT", "destinationId": "WH01"},
}


class FakeLaya:
    model = "fake-laya"

    def __init__(self, available: bool = True) -> None:
        self.available = available

    def classify(self, state, questions, model=None):
        return {
            "answers": {
                "condition": {"choice": "refrigeration_failure", "confidence": 0.92},
                "recommended_action": {"choice": "DIVERT", "confidence": 0.81},
                "urgency": {"score": 2.4},
                "needs_human_review": {"noul": 0.12},
                "route_delay_material": {"noul": 0.05},
            },
            "usage": {"input_tokens": 120, "output_tokens": 0},
            "latencyMs": 12.3,
        }


class DownLaya:
    model = "down"
    available = False

    def classify(self, state, questions, model=None):  # pragma: no cover
        raise AssertionError("classify must not be called when unavailable")


def test_system1_parses_typed_answers(monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(FakeLaya())
    try:
        out = laya_mod.evaluate(CONTEXT, RESULT)
    finally:
        laya_mod.set_client(None)

    assert out is not None
    assert out["source"] == "laya"
    assert out["condition"] == "refrigeration_failure"
    assert out["action"] == "DIVERT"
    assert out["agreesWithDecision"] is True
    assert out["urgency"] == 2.4
    assert out["needsHumanReview"] is False
    assert out["needsHumanReviewProbability"] == 0.12
    assert out["calibrated"] is False
    assert out["provenance"] == "PREDICTED"


def test_system1_unavailable_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(DownLaya())
    try:
        assert laya_mod.evaluate(CONTEXT, RESULT) is None
    finally:
        laya_mod.set_client(None)


def test_system1_disabled_returns_none(monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", False)
    laya_mod.set_client(FakeLaya())
    try:
        assert laya_mod.evaluate(CONTEXT, RESULT) is None
    finally:
        laya_mod.set_client(None)


def test_engine_attaches_system1_without_overriding_decision(monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(FakeLaya())
    try:
        result = engine.evaluate_context(CONTEXT, use_llm=False)
    finally:
        laya_mod.set_client(None)

    assert result["system1"]["action"] == "DIVERT"
    assert result["provenance"]["system1"] == "PREDICTED"
    # The deterministic decision is untouched and still present.
    assert result["decision"]["action"] in {"DIVERT", "PREPARE_INTERVENTION", "MONITOR", "CONTINUE"}
    assert result["recommendation"]["action"] == result["decision"]["action"]


def test_engine_works_when_laya_is_absent(monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(DownLaya())
    try:
        result = engine.evaluate_context(CONTEXT, use_llm=False)
    finally:
        laya_mod.set_client(None)

    assert "system1" not in result
    assert result["riskScore"] is not None


def test_system1_endpoint(client, live, monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(FakeLaya())
    try:
        body = client.get("/api/system1/T102").json()
    finally:
        laya_mod.set_client(None)

    assert body["available"] is True
    assert body["truckId"] == "T102"
    assert body["system1"]["action"] == "DIVERT"
    assert body["deterministicDecision"]["action"] is not None


def test_system1_endpoint_unknown_truck_is_404(client, live):
    assert client.get("/api/system1/NOPE").status_code == 404


def test_system1_endpoint_reports_unavailable(client, live, monkeypatch):
    monkeypatch.setattr(settings, "laya_enabled", True)
    laya_mod.set_client(DownLaya())
    try:
        body = client.get("/api/system1/T102").json()
    finally:
        laya_mod.set_client(None)

    assert body["available"] is False
    assert body["system1"] is None
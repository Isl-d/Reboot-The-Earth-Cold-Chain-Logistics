"""The 8 Person 4 endpoints, with a fake LLM (no network)."""
from __future__ import annotations

import datetime as dt

import pytest

from backend.ingest.consumer import pipeline
from backend.intelligence import llm as llm_mod


class SmartFakeLLM:
    available = True
    model = "fake-explainer"

    def complete_json(self, system, user, max_tokens=None):
        return {
            "spoilageProbability": 0.7,
            "confidence": 0.9,
            "rationale": "Deterioration is accelerating.",
            "selectedWarehouseId": "WH01",
            "explanation": "Divert to the nearest cold store.",
            "action": "DIVERT",
        }


@pytest.fixture()
def fake_llm():
    llm_mod.set_client(SmartFakeLLM())
    yield
    llm_mod.set_client(None)


def _risky(device="TRUCK-T102", secs=0, temp=9.0):
    return {
        "deviceId": device,
        "truckId": device.replace("TRUCK-", ""),
        "timestamp": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=secs)).strftime(
            "%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp, "humidityPct": 74, "latitude": 25.2854, "longitude": 51.531,
        "speedKmh": 42, "gForce": 0.2, "doorOpen": False, "refrigerationOn": False,
    }


def _seed_risk(truck="T102"):
    for i in range(6):
        pipeline.handle(_risky(f"TRUCK-{truck}", secs=-20 + i * 4, temp=8.0 + i))


def test_predictions_endpoint(client, live, fake_llm):
    _seed_risk()
    body = client.get("/api/predictions/CHK-1029").json()
    assert body["batchId"] == "CHK-1029"
    assert body["truckId"] == "T102"
    assert body["riskLevel"] in {"HIGH", "CRITICAL"}
    assert 0.0 <= body["spoilageProbability"] <= 1.0
    assert body["modelVersion"] == "heuristic-1"  # deterministic; the LLM never changes stored values
    assert body["recommendation"]["action"] in {"DIVERT", "PREPARE_INTERVENTION"}
    assert "optimization" in body and "foodLoss" in body


def test_predictions_unknown_batch_is_404(client, live):
    assert client.get("/api/predictions/NOPE").status_code == 404


def test_risk_and_recommendation_endpoints(client, live, fake_llm):
    _seed_risk()
    risk = client.get("/api/risk/CHK-1029").json()
    assert risk["riskScore"] is not None
    assert "riskFactors" in risk

    rec = client.get("/api/recommendations/CHK-1029").json()
    assert rec["recommendation"]["action"] in {"DIVERT", "PREPARE_INTERVENTION"}
    assert rec["recommendation"]["destinationId"] in {"WH01", "WH02", "WH03", None}


def test_optimization_endpoints(client, live, fake_llm):
    _seed_risk()
    stored = client.get("/api/optimization/CHK-1029").json()
    assert stored["optimization"]["candidates"]

    evaluated = client.post("/api/optimization/evaluate", json={"truckId": "T102"}).json()
    assert {c["warehouseId"] for c in evaluated["candidates"]} == {"WH01", "WH02", "WH03"}


def test_optimization_requires_a_target(client, live):
    assert client.post("/api/optimization/evaluate", json={}).status_code == 422


def test_food_loss_analytics(client, live, fake_llm):
    _seed_risk()
    client.get("/api/predictions/CHK-1029")  # ensure a prediction exists
    body = client.get("/api/analytics/food-loss").json()
    for key in ("transportedKg", "atRiskKg", "lostKg", "savedKg",
                "estimatedFinancialLoss", "estimatedFinancialLossPrevented"):
        assert key in body
    assert body["currency"] == "QAR"
    assert body["savedKg"] >= 0.0
    assert body["batches"]


def test_scenario_comparison_is_honest_when_empty(client, live):
    """No predictions -> available false and nulls, never invented headline numbers."""
    body = client.get("/api/analytics/scenario-comparison/REFRIGERATION_FAILURE").json()
    assert body["available"] is False
    assert body["withoutInterventionLossPercent"] is None
    assert body["currency"] == "QAR"


def test_inventory_analytics(client, live):
    body = client.get("/api/analytics/inventory").json()
    assert len(body["items"]) == 7
    assert all(item["recommendedAction"] for item in body["items"])
    assert body["totals"]["inventoryKg"] == 950.0


def test_ai_explain_with_facts_and_with_batch(client, live, fake_llm):
    by_facts = client.post("/api/ai/explain", json={
        "facts": {"batchId": "CHK-1029", "riskLevel": "HIGH", "temperatureC": 8.0}
    }).json()
    assert by_facts["source"] == "explainer"
    assert by_facts["explanation"]

    _seed_risk()
    by_batch = client.post("/api/ai/explain", json={"batchId": "CHK-1029"}).json()
    assert by_batch["facts"]["batchId"] == "CHK-1029"


def test_ai_explain_falls_back_without_a_key(client, live):
    # conftest blanks OPENROUTERAPIKEY; the default client is unavailable.
    body = client.post("/api/ai/explain", json={
        "facts": {"batchId": "CHK-1029", "riskLevel": "HIGH", "temperatureC": 8.0,
                  "recommendation": {"action": "DIVERT"}}
    }).json()
    assert body["source"] == "template"
    assert "CHK-1029" in body["explanation"]
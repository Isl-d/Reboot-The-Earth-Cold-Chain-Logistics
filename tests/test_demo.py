"""End-to-end demo test: the refrigeration-failure story.

    NORMAL -> REFRIGERATION_FAILURE -> risk rises -> incident opens
           -> prediction -> optimization -> recommendation -> food saved

This is the one test that walks the whole product loop on the real ingestion
pipeline and the real intelligence engine, with no broker and no network.
"""
from __future__ import annotations

import datetime as dt

from backend.ingest.consumer import pipeline


def _reading(temp: float, offset_s: int, refrigeration_on: bool = True) -> dict:
    # Keep every timestamp in the past so validation's future-skew rule passes.
    ts = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=45) + dt.timedelta(seconds=offset_s)
    return {
        "deviceId": "TRUCK-T102",
        "truckId": "T102",
        "timestamp": ts.strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp,
        "humidityPct": 74,
        "latitude": 25.2854,
        "longitude": 51.531,
        "speedKmh": 42,
        "gForce": 0.2,
        "doorOpen": False,
        "refrigerationOn": refrigeration_on,
    }


def test_refrigeration_failure_raises_risk_and_recommends_intervention(client, live):
    # 1. Healthy truck: safe range for chicken is 0–4 C.
    pipeline.handle(_reading(3.5, 0))
    healthy = client.get("/api/trucks/T102").json()
    assert healthy["truck"]["temperatureC"] == 3.5
    assert healthy["prediction"]["riskLevel"] in {"LOW", "MEDIUM"}

    # 2. Cooling fails. Over the next 30 simulated minutes the cargo sits at
    #    7 C — three degrees above the safe maximum — accumulating exposure.
    for minute in range(1, 31):
        pipeline.handle(_reading(7.0, minute * 60, refrigeration_on=False))

    # 3. Detection: an incident is open.
    incidents = client.get("/api/incidents", params={"status": "OPEN"}).json()
    assert any(i["truckId"] == "T102" for i in incidents), incidents

    # 4-7. Prediction -> risk -> optimization -> decision -> food loss.
    pred = client.get("/api/predictions/CHK-1029", params={"refresh": "true"}).json()
    assert pred["riskScore"] is not None and pred["riskScore"] >= 50
    assert pred["thermalExposure"] > 0
    assert pred["deteriorationFraction"] > 0
    assert pred["spoilageProbability"] > 0
    assert pred["foodLoss"]["foodSavedKg"] >= 0.0
    assert pred["recommendation"]["action"] in {"DIVERT", "PREPARE_INTERVENTION"}
    assert pred["provenance"]["thermalExposure"] == "CALCULATED"

    # 8. The food-loss comparison is real, not a hardcoded fallback.
    comp = client.get("/api/analytics/scenario-comparison/REFRIGERATION_FAILURE").json()
    assert comp["available"] is True
    assert comp["currency"] == "QAR"
    assert comp["withoutInterventionLossPercent"] >= comp["withOptimizationLossPercent"]
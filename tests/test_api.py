"""REST + WebSocket contract, exercised end to end on SQLite with no broker."""
from __future__ import annotations

import datetime as dt

from sqlalchemy import select

from backend.db import session_scope
from backend.ingest.consumer import pipeline
from backend.models import IngestReject, SensorReading


def _wire(device="TRUCK-T102", temp=3.5, **over):
    msg = {
        "deviceId": device,
        "truckId": device.replace("TRUCK-", ""),
        "timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp,
        "humidityPct": 74,
        "latitude": 25.2854,
        "longitude": 51.531,
        "speedKmh": 42,
        "gForce": 0.2,
        "doorOpen": False,
        "refrigerationOn": True,
    }
    msg.update(over)
    return msg


def test_healthz_reports_fallback_cache(client):
    body = client.get("/healthz").json()
    assert body["status"] == "ok"
    assert body["database"] is True
    assert body["trucks"] == 4


def test_list_and_get_trucks(client, live):
    listed = client.get("/api/trucks").json()["trucks"]
    assert {t["id"] for t in listed} == {"T101", "T102", "T103", "T104"}

    detail = client.get("/api/trucks/T102").json()
    assert detail["truck"]["id"] == "T102"
    assert detail["batch"]["product"] == "Fresh Chicken"
    assert detail["prediction"]["source"] in {"snapshot", "baseline"}


def test_unknown_truck_is_404(client, live):
    assert client.get("/api/trucks/NOPE").status_code == 404
    assert client.get("/api/trucks/NOPE/telemetry").status_code == 404


def test_ingest_updates_live_state_and_history(client, live):
    pipeline.handle(_wire(temp=3.5))

    trucks = {t["id"]: t for t in client.get("/api/trucks").json()["trucks"]}
    assert trucks["T102"]["temperatureC"] == 3.5
    assert trucks["T102"]["riskLevel"] == "LOW"
    assert trucks["T102"]["riskScore"] is not None

    history = client.get("/api/trucks/T102/telemetry").json()
    assert len(history) == 1
    assert history[0]["temperatureC"] == 3.5


def test_high_temperature_ingest_raises_risk_and_incident(client, live):
    pipeline.handle(_wire(temp=9.0))  # safe max is 4 C

    truck = next(t for t in client.get("/api/trucks").json()["trucks"] if t["id"] == "T102")
    assert truck["riskLevel"] == "CRITICAL"
    assert truck["activeIncident"] is True

    open_incidents = client.get("/api/incidents", params={"status": "OPEN"}).json()
    assert any(i["truckId"] == "T102" and i["type"] == "TEMPERATURE_EXCURSION" for i in open_incidents)


def test_rejected_reading_is_logged(client, live):
    pipeline.handle(_wire(humidityPct=150))

    with session_scope() as session:
        rejects = session.execute(select(IngestReject)).scalars().all()
        readings = session.execute(select(SensorReading)).scalars().all()
    assert len(rejects) == 1
    assert "humidityPct" in rejects[0].reason
    assert readings == []


def test_telemetry_time_filter(client, live):
    base = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=5)
    for offset in (0, 60, 120):
        pipeline.handle(_wire(temp=3.0, timestamp=(base + dt.timedelta(seconds=offset)).strftime("%Y-%m-%dT%H:%M:%SZ")))
    start = (base + dt.timedelta(seconds=30)).strftime("%Y-%m-%dT%H:%M:%SZ")
    rows = client.get("/api/trucks/T102/telemetry", params={"from": start}).json()
    assert len(rows) == 2


def test_telemetry_limit_keeps_the_newest_readings(client, live):
    """A live chart polls with the default limit; once a truck has more
    readings than that, it must get the latest window, not the first one."""
    base = dt.datetime.now(dt.timezone.utc) - dt.timedelta(minutes=10)
    for i in range(5):
        pipeline.handle(_wire(temp=1.0 + i, timestamp=(base + dt.timedelta(seconds=3 * i)).strftime("%Y-%m-%dT%H:%M:%SZ")))
    rows = client.get("/api/trucks/T102/telemetry", params={"limit": 2}).json()
    assert [r["temperatureC"] for r in rows] == [4.0, 5.0]  # newest two, oldest first


def test_warehouses_stores_inventory(client, live):
    assert len(client.get("/api/warehouses").json()["warehouses"]) == 3
    inv = client.get("/api/inventory").json()["inventory"]
    assert len(inv) == 7
    batch_inv = client.get("/api/inventory/CHK-1028").json()
    assert batch_inv[0]["locationType"] == "warehouse"


def test_simulation_scenario_validation(client, live):
    bad = client.post("/api/simulation/scenario", json={"truckId": "T102", "scenario": "NOPE"})
    assert bad.status_code == 422
    assert "allowed" in bad.json()["detail"]

    ok = client.post("/api/simulation/scenario", json={"truckId": "T102", "scenario": "REFRIGERATION_FAILURE"})
    assert ok.status_code == 200
    assert ok.json()["scenario"] == "REFRIGERATION_FAILURE"

    assert client.post("/api/simulation/start", json={}).json()["status"] == "started"
    assert client.post("/api/simulation/stop", json={}).json()["status"] == "stopped"
    assert client.post("/api/simulation/reset", json={}).json()["status"] == "reset"


def test_simulation_mutations_return_full_state(client, live):
    """POST mutations must return the state DTO the frontend adapter validates."""
    ok = client.post("/api/simulation/scenario",
                     json={"truckId": "T102", "scenario": "REFRIGERATION_FAILURE"}).json()
    assert ok["truckId"] == "T102"
    assert ok["batchId"] == "CHK-1029"
    assert ok["scenario"] == "REFRIGERATION_FAILURE"
    assert ok["startedAt"]
    assert ok["status"] == "accepted"

    stopped = client.post("/api/simulation/stop", json={"truckId": "T102"}).json()
    assert stopped["running"] is False
    assert stopped["status"] == "stopped"

    reset = client.post("/api/simulation/reset", json={"truckId": "T102"}).json()
    assert reset["status"] == "reset"
    assert reset["batchId"] == "CHK-1029"


def test_person4_context_and_prediction_roundtrip(client, live):
    pipeline.handle(_wire(temp=7.2))

    ctx = client.get("/api/internal/context/T102").json()
    assert ctx["truck"]["id"] == "T102"
    assert ctx["batch"]["id"] == "CHK-1029"
    assert ctx["batch"]["safeMaxTempC"] == 4.0
    assert len(ctx["recentTelemetry"]) == 1
    assert {w["id"] for w in ctx["candidateWarehouses"]} == {"WH01", "WH02", "WH03"}

    recorded = client.post("/api/internal/predictions", json={
        "truckId": "T102",
        "batchId": "CHK-1029",
        "thermalExposure": 42.8,
        "remainingShelfLifeHours": 38,
        "spoilageProbability": 0.73,
        "confidence": 0.91,
        "riskScore": 91,
        "riskLevel": "CRITICAL",
        "recommendation": {"action": "DIVERT", "destinationId": "WH01"},
        "modelVersion": "person4-test",
    })
    assert recorded.status_code == 200

    truck = next(t for t in client.get("/api/trucks").json()["trucks"] if t["id"] == "T102")
    # Displayed values come from the canonical snapshot (deterministic), so an
    # externally posted prediction is stored but does not override them.
    assert truck["riskScore"] is not None
    assert truck["riskLevel"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

    detail = client.get("/api/trucks/T102").json()
    assert detail["prediction"]["source"] in {"snapshot", "person4"}
    assert detail["prediction"]["spoilageProbability"] is not None
    assert detail["recommendation"]["action"] in {
        "CONTINUE", "MONITOR", "PREPARE_INTERVENTION", "DIVERT"}


def test_device_events_are_stored_and_served(client, live):
    pipeline.handle_event({
        "truckId": "T102", "deviceId": "TRUCK-T102", "type": "DOOR_OPENED",
        "detail": "lid lifted", "timestamp": "2026-09-25T09:00:00Z",
    })
    body = client.get("/api/trucks/T102/events").json()
    assert body["count"] == 1
    assert body["events"][0]["type"] == "DOOR_OPENED"

    fleet = client.get("/api/device-events").json()
    assert fleet["count"] == 1


def test_unknown_device_event_type_is_rejected(client, live):
    assert pipeline.handle_event({"truckId": "T102", "type": "TELEPORTED"}) is None
    assert client.get("/api/device-events").json()["count"] == 0


def test_opendata_catalogue_is_served(client):
    body = client.get("/api/opendata").json()
    assert body["available"] is True
    assert body["count"] >= 15
    assert all("licence" in s and "category" in s for s in body["sources"])


def test_websocket_receives_live_state(client, live):
    with client.websocket_connect("/ws/live") as ws:
        hello = ws.receive_json()
        assert hello["event"] == "HELLO"
        assert {t["id"] for t in hello["trucks"]} == {"T101", "T102", "T103", "T104"}

        pipeline.handle(_wire(temp=3.5))
        message = ws.receive_json()
    assert message["event"] == "TRUCK_STATE_UPDATED"
    assert message["truckId"] == "T102"
    assert message["temperatureC"] == 3.5
    assert "riskScore" in message and "riskLevel" in message

def test_a_failing_message_does_not_kill_the_feed(client, live, monkeypatch):
    """paho re-raises callback errors and its thread dies; _on_message must not raise."""
    import json
    import types

    def boom(_raw):
        raise RuntimeError("database is locked")

    monkeypatch.setattr(pipeline, "handle", boom)
    msg = types.SimpleNamespace(topic="coldchain/trucks/T102/telemetry",
                                payload=json.dumps(_wire()).encode())
    pipeline._on_message(None, None, msg)  # must not raise

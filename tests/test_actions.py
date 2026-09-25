"""Actions: intelligence that acts, not just advises."""
from __future__ import annotations

import datetime as dt

from backend.ingest.consumer import pipeline


def _wire(temp: float) -> dict:
    return {
        "deviceId": "TRUCK-T102", "truckId": "T102",
        "timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp, "humidityPct": 74, "latitude": 25.2854, "longitude": 51.531,
        "speedKmh": 42, "gForce": 0.2, "doorOpen": False, "refrigerationOn": True,
    }


def test_execute_action_records_and_lists(client, live):
    body = client.post("/api/actions/execute",
                       json={"truckId": "T102", "action": "DIVERT", "destinationId": "WH01"}).json()
    assert body["action"] == "DIVERT"
    assert body["destinationId"] == "WH01"
    assert body["status"] == "EXECUTED"
    assert body["source"] == "operator"

    listed = client.get("/api/actions", params={"truckId": "T102"}).json()["actions"]
    assert any(a["id"] == body["id"] for a in listed)


def test_invalid_action_is_422(client, live):
    r = client.post("/api/actions/execute", json={"truckId": "T102", "action": "TELEPORT"})
    assert r.status_code == 422
    assert "allowed" in r.json()["detail"]


def test_acknowledge_resolves_open_incidents(client, live):
    pipeline.handle(_wire(9.0))  # above the 4 C safe max -> opens incidents
    assert client.get("/api/incidents", params={"status": "OPEN", "truckId": "T102"}).json()

    client.post("/api/actions/execute", json={"truckId": "T102", "action": "ACKNOWLEDGE"})
    assert client.get("/api/incidents", params={"status": "OPEN", "truckId": "T102"}).json() == []


def test_prioritize_sale_updates_inventory(client, live):
    body = client.post("/api/actions/execute",
                       json={"batchId": "CHK-1028", "action": "PRIORITIZE_SALE"}).json()
    assert body["detail"].get("inventoryStatus") == "prioritize_sale"


def test_autopilot_skips_when_not_escalated(client, live):
    body = client.post("/api/actions/auto/T102").json()
    assert body["executed"] is False
    assert body["action"] is None


def test_autopilot_requires_known_truck(client, live):
    assert client.post("/api/actions/auto/NOPE").status_code == 404
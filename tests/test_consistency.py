"""Consistency: every page reads one computed snapshot, so the values agree.

And manual control: an operator can drive one truck's values directly.
"""
from __future__ import annotations

import datetime as dt

from backend.ingest.consumer import pipeline


def _wire(temp: float, secs: int = 0) -> dict:
    return {
        "deviceId": "TRUCK-T102", "truckId": "T102",
        "timestamp": (dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=secs)).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "temperatureC": temp, "humidityPct": 74, "latitude": 25.2854, "longitude": 51.531,
        "speedKmh": 42, "gForce": 0.2, "doorOpen": False, "refrigerationOn": True,
    }


def test_pages_show_the_same_computed_values(client, live):
    pipeline.handle(_wire(7.0))

    truck = client.get("/api/trucks/T102").json()
    pred = truck["prediction"]
    exposure = client.get("/api/model/T102/thermal-exposure").json()
    spoilage = client.get("/api/model/T102/spoilage").json()
    deterioration = client.get("/api/model/T102/deterioration").json()

    # The model cards are slices of the very same snapshot the truck shows.
    assert exposure["thermalExposure"] == pred["thermalExposure"]
    assert spoilage["spoilageProbability"] == pred["spoilageProbability"]
    assert deterioration["remainingShelfLifeHours"] == pred["remainingShelfLifeHours"]
    # And the risk shown on the truck is the snapshot's risk.
    assert pred["riskScore"] is not None
    assert pred["riskLevel"] in {"LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_manual_mode_sets_and_clears(client, live):
    applied = client.post("/api/simulation/manual", json={
        "truckId": "T102", "temperatureC": 9.5, "humidityPct": 60,
        "speedKmh": 0, "doorOpen": True, "refrigerationOn": False,
    }).json()
    assert applied["manual"] is True
    assert applied["values"]["temperatureC"] == 9.5

    current = client.get("/api/simulation/manual").json()["manual"]
    assert current["T102"]["temperatureC"] == 9.5

    cleared = client.request("DELETE", "/api/simulation/manual/T102").json()
    assert cleared["manual"] is False
    assert client.get("/api/simulation/manual").json()["manual"] == {}


def test_manual_unknown_truck_is_404(client, live):
    assert client.post("/api/simulation/manual", json={"truckId": "NOPE", "temperatureC": 5}).status_code == 404


def test_snapshot_is_deterministic(client, live):
    pipeline.handle(_wire(6.0))
    a = client.get("/api/model/T102/spoilage").json()["spoilageProbability"]
    b = client.get("/api/model/T102/spoilage").json()["spoilageProbability"]
    assert a == b


def test_reset_preserves_time_series(client, live):
    pipeline.handle(_wire(5.0, 0))
    pipeline.handle(_wire(6.0, 2))
    before = client.get("/api/trucks/T102/telemetry").json()
    assert len(before) == 2

    client.post("/api/simulation/reset", json={"truckId": "T102"})

    # History is persistent: reset does not delete stored readings.
    after = client.get("/api/trucks/T102/telemetry").json()
    assert len(after) == 2
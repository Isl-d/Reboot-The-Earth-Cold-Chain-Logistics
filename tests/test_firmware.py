"""The sensor node speaks the same contract as the simulator.

firmware/node/node.ino keeps its wire formats as single C string constants.
These tests fill them in and run them through the backend's own validators, so
a firmware change that breaks the contract fails here, not on stage.
"""
from __future__ import annotations

import csv
import datetime as dt
import json
import pathlib
import re

from backend.config import settings
from backend.ingest.events import ALLOWED_TYPES, normalize_event
from backend.ingest.validate import validate

ROOT = pathlib.Path(__file__).resolve().parents[1]
NODE = (ROOT / "firmware" / "node" / "node.ino").read_text(encoding="utf-8")


def _string(name: str) -> str:
    """A `const char* NAME = "..." "...";` constant, adjacent literals joined."""
    body = re.search(rf'\b{name}\s*=\s*("(?:.|\n)*?);', NODE).group(1)
    return "".join(re.findall(r'"((?:[^"\\]|\\.)*)"', body)).replace('\\"', '"')


def _number(name: str) -> float:
    return float(re.search(rf"\b{name}\s*=\s*([-\d.]+)\s*;", NODE).group(1))


def _now() -> str:
    return dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


DEVICE, TRUCK = _string("DEVICE_ID"), _string("TRUCK_ID")


def test_node_is_a_truck_of_the_fleet():
    with open(ROOT / "data" / "trucks.csv", newline="") as fh:
        devices = {row["id"]: row["device_id"] for row in csv.DictReader(fh)}
    assert devices.get(TRUCK) == DEVICE


def test_node_publishes_on_the_topics_the_backend_subscribes_to():
    assert _string("TELEMETRY_TOPIC_FMT") % TRUCK == settings.telemetry_topic.replace("+", TRUCK)
    assert _string("EVENTS_TOPIC_FMT") % TRUCK == settings.events_topic.replace("+", TRUCK)


def test_node_telemetry_passes_the_validator():
    raw = json.loads(_string("TELEMETRY_FMT") % (
        DEVICE, TRUCK, _now(), 3.4, 86.0, _number("PARK_LAT"), _number("PARK_LON"), "false"))
    model, reasons = validate(raw, {DEVICE})
    assert reasons == []
    assert (model.temperatureC, model.humidityPct, model.doorOpen) == (3.4, 86.0, False)


def test_node_events_pass_the_event_validator():
    sent = re.findall(r'"(SENSOR_FAULT|DOOR_OPENED|DOOR_CLOSED)"', NODE)
    assert set(sent) == {"SENSOR_FAULT", "DOOR_OPENED", "DOOR_CLOSED"}
    for event_type in sent:
        assert event_type in ALLOWED_TYPES
        raw = json.loads(_string("EVENT_FMT") % (DEVICE, TRUCK, _now(), event_type, "lid switch"))
        event, reasons = normalize_event(raw)
        assert reasons == []
        assert (event["truckId"], event["type"]) == (TRUCK, event_type)

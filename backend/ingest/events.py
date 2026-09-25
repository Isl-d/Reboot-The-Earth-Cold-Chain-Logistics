"""Typed device events: the contract for ``coldchain/trucks/{id}/events``.

Telemetry describes state; an event describes a change. The brief names the
topic but not the payload, so this contract is ours to define and change.

Accepted type set is closed on purpose — a type no client can render is not
useful data, so anything else is rejected with a reason rather than stored.
"""
from __future__ import annotations

import datetime as dt

# Closed vocabulary. Keep in step with docs/API_CONTRACT.md.
ALLOWED_TYPES = {
    "DOOR_OPENED",
    "DOOR_CLOSED",
    "REFRIGERATION_ON",
    "REFRIGERATION_OFF",
    "SHOCK",
    "POWER_LOST",
    "POWER_RESTORED",
    "SENSOR_FAULT",
    "SCENARIO_CHANGED",
}


def _parse_ts(value) -> dt.datetime | None:
    if isinstance(value, dt.datetime):
        return value if value.tzinfo else value.replace(tzinfo=dt.timezone.utc)
    if not isinstance(value, str):
        return None
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=dt.timezone.utc)


def normalize_event(raw: dict, truck_id: str | None = None) -> tuple[dict | None, list[str]]:
    """Validate one raw events payload. Returns (event, reasons)."""
    if not isinstance(raw, dict):
        return None, ["payload is not a JSON object"]

    event_type = str(raw.get("type") or raw.get("event") or "").upper()
    if event_type not in ALLOWED_TYPES:
        return None, [f"unknown event type '{event_type}'"]

    resolved_truck = (
        raw.get("truckId")
        or truck_id
        or (str(raw.get("deviceId") or "").replace("TRUCK-", "") or None)
    )
    if not resolved_truck:
        return None, ["no recoverable truckId"]

    ts = _parse_ts(raw.get("timestamp")) or dt.datetime.now(dt.timezone.utc)
    value = raw.get("value")
    try:
        value = float(value) if value is not None else None
    except (TypeError, ValueError):
        value = None

    return {
        "truckId": resolved_truck,
        "deviceId": raw.get("deviceId"),
        "timestamp": ts,
        "type": event_type,
        "detail": str(raw.get("detail") or raw.get("scenario") or ""),
        "value": value,
    }, []
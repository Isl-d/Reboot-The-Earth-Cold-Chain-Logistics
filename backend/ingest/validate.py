"""Validation: reject bad readings and say why. Never silently drop.

Two layers:
  1. Pydantic checks the shape and the hard sensor ranges (humidity, lat/lon,
     speed, g-force) with precise messages.
  2. Config-dependent checks: plausible temperature, clock sanity, and that
     the device is actually known to the fleet.
"""
from __future__ import annotations

import datetime as dt

from pydantic import ValidationError

from ..config import settings
from ..schemas import TelemetryIn


def validate(raw: dict, known_devices: set[str]) -> tuple[TelemetryIn | None, list[str]]:
    reasons: list[str] = []

    try:
        model = TelemetryIn.model_validate(raw)
    except ValidationError as exc:
        for err in exc.errors():
            loc = ".".join(str(p) for p in err["loc"]) or "payload"
            reasons.append(f"{loc}: {err['msg']}")
        return None, reasons

    # clock sanity
    ts = model.timestamp
    if ts.tzinfo is None:
        reasons.append("timestamp: missing timezone (expected ISO-8601 with Z or offset)")
    else:
        now = dt.datetime.now(dt.timezone.utc)
        skew = (ts - now).total_seconds()
        if skew > settings.max_clock_skew_future_s:
            reasons.append(f"timestamp: {skew:.0f}s in the future")
        elif -skew > settings.max_clock_skew_past_s:
            reasons.append(f"timestamp: {-skew:.0f}s in the past")

    # plausible temperature
    if not (settings.min_plausible_temp_c <= model.temperatureC <= settings.max_plausible_temp_c):
        reasons.append(
            f"temperatureC: {model.temperatureC} outside plausible range "
            f"[{settings.min_plausible_temp_c}, {settings.max_plausible_temp_c}]"
        )

    # known device
    if model.deviceId not in known_devices:
        reasons.append(f"deviceId: unknown device '{model.deviceId}'")

    if reasons:
        return None, reasons
    return model, []
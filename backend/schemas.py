"""Pydantic schemas — the wire contracts.

Telemetry is validated field by field here; the checks that need project
config (plausible temperature, clock sanity) live in ``ingest.validate`` so
the rejection reason is precise and logged.
"""
from __future__ import annotations

import datetime as dt

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class TelemetryIn(BaseModel):
    """One sensor message, exactly as published on MQTT (camelCase contract).

    The Person 3 brief also shows the short spellings ``temperature``,
    ``humidity``, ``lat`` and ``lon``; both are accepted so a publisher can use
    either without the backend caring. The canonical field names (and all
    outbound payloads) stay camelCase.
    """

    model_config = ConfigDict(extra="allow", populate_by_name=True)

    deviceId: str = Field(min_length=1)
    truckId: str | None = None
    timestamp: dt.datetime
    temperatureC: float = Field(validation_alias=AliasChoices("temperatureC", "temperature"))
    humidityPct: float = Field(ge=0, le=100, validation_alias=AliasChoices("humidityPct", "humidity"))
    latitude: float = Field(ge=-90, le=90, validation_alias=AliasChoices("latitude", "lat"))
    longitude: float = Field(ge=-180, le=180, validation_alias=AliasChoices("longitude", "lon"))
    speedKmh: float = Field(ge=0, le=300, validation_alias=AliasChoices("speedKmh", "speed"))
    gForce: float = Field(ge=0, le=50, validation_alias=AliasChoices("gForce", "gforce"))
    doorOpen: bool
    refrigerationOn: bool


class ScenarioCommand(BaseModel):
    truckId: str | None = None
    scenario: str
    speedMultiplier: float = 1.0


class PredictionIn(BaseModel):
    """A prediction pushed by Person 4's engine."""

    model_config = ConfigDict(extra="allow")

    id: str | None = None
    truckId: str
    batchId: str | None = None
    thermalExposure: float | None = None
    remainingShelfLifeHours: float | None = None
    spoilageProbability: float | None = None
    confidence: float | None = None
    riskScore: float | None = None
    riskLevel: str | None = None
    recommendation: dict | None = None
    modelVersion: str = "person4"
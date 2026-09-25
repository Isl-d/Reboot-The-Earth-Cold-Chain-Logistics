"""Test configuration.

Environment is pinned *before* any ``backend`` import: ``backend.config`` builds
its settings singleton at import time and ``backend.db`` builds the engine at
import time, so the test database must be chosen first.

The suite runs against a throwaway SQLite file with Redis and MQTT pointed at
closed ports. That is deliberate: the in-process cache fallback and the
"broker unavailable" paths are part of what is being tested. No network calls
are made (the LLM key is blanked).
"""
from __future__ import annotations

import os
import pathlib
import sys
import tempfile

_TMP = pathlib.Path(tempfile.mkdtemp(prefix="coldchain-tests-"))
os.environ["CC_DATABASE_URL"] = f"sqlite:///{_TMP / 'test.db'}"
os.environ["CC_REDIS_URL"] = "redis://127.0.0.1:1/0"
os.environ["CC_TIMESCALE_ENABLED"] = "false"
os.environ["CC_MQTT_HOST"] = "127.0.0.1"
os.environ["CC_MQTT_PORT"] = "1"
os.environ["CC_INTELLIGENCE_ENABLED"] = "false"
os.environ["CC_LAYA_ENABLED"] = "false"
os.environ["OPENROUTERAPIKEY"] = ""

# The simulator modules are standalone scripts, not an installed package.
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent.parent / "sensor-simulator"))

import pytest  # noqa: E402


@pytest.fixture(scope="session")
def client():
    from fastapi.testclient import TestClient

    from backend.main import app

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def live(client):
    """A clean database + tracker + cache for a test that exercises the app."""
    from sqlalchemy import delete

    from backend import cache as cache_mod
    from backend.db import session_scope
    from backend.models import (
        Action,
        DeviceEvent,
        Incident,
        IngestReject,
        Prediction,
        SensorReading,
        SimulationRun,
    )
    from backend.processing import tracker

    with session_scope() as session:
        for model in (Action, SensorReading, DeviceEvent, Incident, IngestReject, Prediction, SimulationRun):
            session.execute(delete(model))

    tracker.reset()
    cache_mod.cache.clear()
    # The System-1 endpoint has a short TTL cache; clear it so tests are isolated.
    from backend.routers import intelligence as _intel_router
    _intel_router._system1_cache.clear()
    yield
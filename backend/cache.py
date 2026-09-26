"""Redis: fast current state, never the authoritative history.

Keys, per the Person 3 brief::

    truck:{id}:latest     latest reading + derived values + risk (one JSON blob)
    truck:{id}:risk       latest risk score/level only
    truck:{id}:location   latest position + speed
    prediction:{id}       latest Person 4 prediction
    trucks:live           set of truck ids that have reported
    incidents:active      set of open incident ids

Redis is optional. If it cannot be reached the first time it is used, this
module permanently falls back to an in-process store so the demo, the test
suite (``make test``) and ``scripts/dev_no_broker.py`` all keep a live view of
the fleet. There is exactly one backend process, so the fallback is complete;
with Redis present the behaviour is unchanged.
"""
from __future__ import annotations

import json
import logging
from typing import Any

import redis

from .config import settings

log = logging.getLogger("coldchain.cache")


class Cache:
    def __init__(self, url: str | None = None) -> None:
        self._client: redis.Redis | None = None
        self._url = url or settings.redis_url
        self._redis_failed = False
        # in-process fallback (used only when Redis is unreachable)
        self._mem: dict[str, str] = {}
        self._mem_sets: dict[str, set[str]] = {}

    @property
    def client(self) -> redis.Redis | None:
        if self._client is None and not self._redis_failed:
            try:
                self._client = redis.from_url(self._url, decode_responses=True,
                                              socket_connect_timeout=2)
                self._client.ping()
            except Exception as exc:  # pragma: no cover - demo safety
                log.warning("Redis unavailable (%s); using in-process live cache", exc)
                self._client = None
                self._redis_failed = True  # never retry on the ingest hot path
        return self._client

    @property
    def using_redis(self) -> bool:
        return self.client is not None

    # ------------------------------------------------------------- internals
    def _set(self, key: str, value: Any, ttl: int = 3600) -> None:
        c = self.client
        raw = json.dumps(value)
        if c is None:
            self._mem[key] = raw
            return
        try:
            c.set(key, raw, ex=ttl)
        except Exception as exc:  # pragma: no cover
            log.warning("redis set %s failed: %s", key, exc)

    def _get(self, key: str) -> Any:
        c = self.client
        if c is None:
            raw = self._mem.get(key)
            return json.loads(raw) if raw else None
        try:
            raw = c.get(key)
            return json.loads(raw) if raw else None
        except Exception:  # pragma: no cover
            return None

    def _sadd(self, key: str, member: str) -> None:
        c = self.client
        if c is None:
            self._mem_sets.setdefault(key, set()).add(member)
            return
        try:
            c.sadd(key, member)
        except Exception:  # pragma: no cover
            pass

    def _srem(self, key: str, member: str) -> None:
        c = self.client
        if c is None:
            self._mem_sets.get(key, set()).discard(member)
            return
        try:
            c.srem(key, member)
        except Exception:  # pragma: no cover
            pass

    def _smembers(self, key: str) -> list[str]:
        c = self.client
        if c is None:
            return sorted(self._mem_sets.get(key, set()))
        try:
            return sorted(c.smembers(key))
        except Exception:  # pragma: no cover
            return []

    # ------------------------------------------------------------ truck state
    def set_truck_state(self, truck_id: str, reading: dict, derived: dict, risk: dict) -> None:
        blob = {"reading": reading, "derived": derived, "risk": risk}
        self._set(f"truck:{truck_id}:latest", blob)
        self._set(f"truck:{truck_id}:risk", risk)
        self._set(f"truck:{truck_id}:location", {
            "latitude": reading.get("latitude"),
            "longitude": reading.get("longitude"),
            "speedKmh": reading.get("speedKmh"),
            "timestamp": reading.get("timestamp"),
        })
        self._sadd("trucks:live", truck_id)

    def get_truck_state(self, truck_id: str) -> dict | None:
        return self._get(f"truck:{truck_id}:latest")

    def get_risk(self, truck_id: str) -> dict | None:
        return self._get(f"truck:{truck_id}:risk")

    def set_risk(self, truck_id: str, risk: dict) -> None:
        self._set(f"truck:{truck_id}:risk", risk)

    def live_truck_ids(self) -> list[str]:
        return self._smembers("trucks:live")

    # --------------------------------------------------------------- incidents
    def set_active_incident(self, incident: dict) -> None:
        self._set(f"incident:{incident['id']}", incident, ttl=86400)
        self._sadd("incidents:active", incident["id"])

    def close_active_incident(self, incident_id: str) -> None:
        self._srem("incidents:active", incident_id)

    def active_incident_ids(self) -> list[str]:
        return self._smembers("incidents:active")

    def set_prediction(self, truck_id: str, prediction: dict) -> None:
        self._set(f"prediction:{truck_id}", prediction)

    def get_prediction(self, truck_id: str) -> dict | None:
        return self._get(f"prediction:{truck_id}")

    # ------------------------------------------------------------ reset marker
    # A reset marks a point in time rather than deleting history, so the
    # time-series stays persistent while the derived state starts fresh.
    def set_reset_at(self, truck_id: str, ts_iso: str) -> None:
        self._set(f"truck:{truck_id}:reset_at", ts_iso, ttl=7 * 24 * 3600)

    def get_reset_at(self, truck_id: str) -> str | None:
        return self._get(f"truck:{truck_id}:reset_at")

    # ----------------------------------------------------------------- debug
    def clear(self) -> None:
        """Drop every cached key (Redis DB 0 and the in-process fallback)."""
        c = self.client
        self._mem.clear()
        self._mem_sets.clear()
        if c is not None:
            try:
                c.flushdb()
            except Exception:  # pragma: no cover
                pass


cache = Cache()
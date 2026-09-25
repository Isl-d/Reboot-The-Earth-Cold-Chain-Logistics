"""Manual control: drive one truck by hand from outside the app.

When manual mode is on for a truck, the simulator is paused for it and the
backend emits the operator's exact telemetry values on the normal cadence. The
values flow through the *same* ingestion pipeline as the simulator, so nothing
downstream needs to know the difference — and every derived number stays a
deterministic function of the reading.
"""
from __future__ import annotations

import datetime as dt
import threading

from .cache import cache
from .config import settings
from .ingest.consumer import pipeline

_FIELDS = ("temperatureC", "humidityPct", "speedKmh", "gForce", "doorOpen", "refrigerationOn")


class ManualController:
    def __init__(self) -> None:
        self._overrides: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._thread: threading.Thread | None = None
        self._stop = threading.Event()

    def set(self, truck_id: str, values: dict) -> dict:
        clean = {k: v for k, v in values.items() if k in _FIELDS and v is not None}
        with self._lock:
            self._overrides.setdefault(truck_id, {}).update(clean)
        # Pause the simulator for this truck so only manual readings arrive.
        pipeline.publish_control(truck_id, {"paused": True})
        self._ensure_running()
        return self._overrides[truck_id]

    def clear(self, truck_id: str | None = None) -> None:
        with self._lock:
            if truck_id is None:
                targets = list(self._overrides)
                self._overrides.clear()
            else:
                targets = [truck_id]
                self._overrides.pop(truck_id, None)
        for tid in targets:
            pipeline.publish_control(tid, {"paused": False})

    def all(self) -> dict:
        with self._lock:
            return {k: dict(v) for k, v in self._overrides.items()}

    # ------------------------------------------------------------------ emitter
    def _ensure_running(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="manual-emitter", daemon=True)
        self._thread.start()

    def _loop(self) -> None:
        while not self._stop.wait(settings.reading_interval_s):
            with self._lock:
                items = list(self._overrides.items())
            if not items:
                self._stop.set()
                return
            for truck_id, values in items:
                try:
                    pipeline.handle(self._payload(truck_id, values))
                except Exception:  # pragma: no cover - one bad tick must not stop the loop
                    pass

    @staticmethod
    def _payload(truck_id: str, values: dict) -> dict:
        state = cache.get_truck_state(truck_id) or {}
        reading = state.get("reading") or {}
        info = pipeline.truck_info.get(truck_id) or {}
        return {
            "deviceId": info.get("device_id") or f"TRUCK-{truck_id}",
            "truckId": truck_id,
            "timestamp": dt.datetime.now(dt.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "temperatureC": values.get("temperatureC", reading.get("temperatureC", 2.5)),
            "humidityPct": values.get("humidityPct", reading.get("humidityPct", 85.0)),
            "latitude": reading.get("latitude", 25.2854),
            "longitude": reading.get("longitude", 51.5310),
            "speedKmh": values.get("speedKmh", reading.get("speedKmh", 40.0)),
            "gForce": values.get("gForce", reading.get("gForce", 0.02)),
            "doorOpen": bool(values.get("doorOpen", reading.get("doorOpen", False))),
            "refrigerationOn": bool(values.get("refrigerationOn", reading.get("refrigerationOn", True))),
        }


manual = ManualController()
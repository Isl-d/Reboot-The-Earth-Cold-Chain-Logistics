"""Background worker: run the intelligence engine off the ingest hot path.

The MQTT consumer only marks a truck dirty; this thread evaluates all dirty
trucks every ``settings.intelligence_interval_s`` seconds. That keeps telemetry
ingestion fast even when the LLM is slow, and throttles repeated work per truck.
"""
from __future__ import annotations

import logging
import threading

from ..config import settings

log = logging.getLogger("coldchain.intelligence.worker")


class IntelligenceWorker(threading.Thread):
    def __init__(self) -> None:
        super().__init__(name="intelligence-worker", daemon=True)
        self._pending: set[str] = set()
        self._lock = threading.Lock()
        self._stop = threading.Event()

    def mark_dirty(self, truck_id: str) -> None:
        if not truck_id:
            return
        with self._lock:
            self._pending.add(truck_id)

    def run(self) -> None:
        from . import engine

        while not self._stop.wait(settings.intelligence_interval_s):
            with self._lock:
                batch = sorted(self._pending)
                self._pending.clear()
            for truck_id in batch:
                try:
                    engine.evaluate_truck(truck_id)
                except Exception:
                    log.exception("intelligence evaluation failed for %s", truck_id)

    def stop(self) -> None:
        self._stop.set()


worker = IntelligenceWorker()
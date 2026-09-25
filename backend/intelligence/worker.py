"""Background worker: run the intelligence engine off the ingest hot path.

The MQTT consumer only marks a truck dirty; this thread evaluates all dirty
trucks every ``settings.intelligence_interval_s`` seconds and persists the
result. Evaluation reads the canonical snapshot, so the stored values are the
same deterministic numbers every page shows — the LLM never changes a value.
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
                    # Deterministic only: System 1 is on-demand, and the LLM is
                    # never in this loop, so a slow model can't block or diverge
                    # the stored values.
                    engine.evaluate_truck(truck_id, include_system1=False)
                except Exception:
                    log.exception("intelligence evaluation failed for %s", truck_id)

    def stop(self) -> None:
        self._stop.set()


worker = IntelligenceWorker()
"""Background worker: run the intelligence engine off the ingest hot path.

The MQTT consumer only marks a truck dirty; this thread evaluates all dirty
trucks every ``settings.intelligence_interval_s`` seconds. That keeps telemetry
ingestion fast even when the LLM is slow, and throttles repeated work per truck.
"""
from __future__ import annotations

import logging
import threading
import time

from ..config import settings

log = logging.getLogger("coldchain.intelligence.worker")


class IntelligenceWorker(threading.Thread):
    def __init__(self) -> None:
        super().__init__(name="intelligence-worker", daemon=True)
        self._pending: set[str] = set()
        self._lock = threading.Lock()
        self._stop = threading.Event()
        self._last_llm: dict[str, float] = {}

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
                    # Deterministic chain every cycle (fast, no network).
                    result = engine.evaluate_truck(truck_id, use_llm=False)
                    level = (result or {}).get("riskLevel")

                    # Ask the explainer only when it matters — when risk escalates
                    # — and at most once per interval per truck, so a 5 s loop
                    # never rate-limits the provider and healthy trucks cost nothing.
                    if level in {"HIGH", "CRITICAL"}:
                        now = time.monotonic()
                        if (now - self._last_llm.get(truck_id, 0.0)) >= settings.llm_min_interval_s:
                            engine.evaluate_truck(truck_id, use_llm=True)
                            self._last_llm[truck_id] = now
                except Exception:
                    log.exception("intelligence evaluation failed for %s", truck_id)

    def stop(self) -> None:
        self._stop.set()


worker = IntelligenceWorker()
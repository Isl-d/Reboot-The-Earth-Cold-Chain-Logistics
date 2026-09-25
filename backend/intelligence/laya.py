"""Laya — local, non-autoregressive System 1 decision engine (optional).

Laya (Convai Innovations, Apache-2.0) answers *typed questions* about a state in
a single forward pass and **never generates text**, so it cannot hallucinate a
number. It runs as a separate service (``laya-serve``) over the Jev-compatible
``POST /v1/systemone`` wire protocol::

    {"state": {...}, "questions": {...}}  ->  {"answers": {...}, "usage": {...}}

Design rules:

* Laya **corroborates** the deterministic decision engine — it never overrides
  it. The engine result is the authority; Laya adds a typed System-1 read,
  a calibrated-intention confidence, urgency and a human-review signal.
* Laya is entirely optional. If the service is down, slow, or returns an
  unexpected shape, :func:`evaluate` returns ``None`` and the pipeline is
  unaffected.

This mirrors the LLM seam in ``llm.py``: a client with an ``available`` flag and
a ``set_client`` test seam.
"""
from __future__ import annotations

import logging
import time

import httpx

from ..config import settings

log = logging.getLogger("coldchain.intelligence.laya")

# --------------------------------------------------------------------- schema
# Labels are semantic words (never boolean words like "true"/"false"): the
# model card warns that choice keys are rendered verbatim and boolean labels can
# be followed instead of the descriptions.
CONDITIONS = [
    "normal",
    "temperature_excursion",
    "refrigeration_failure",
    "door_left_open",
    "sensor_fault",
    "traffic_delay",
]
ACTIONS = [
    "CONTINUE",
    "MONITOR",
    "PREPARE_INTERVENTION",
    "DIVERT",
    "REDISTRIBUTE",
    "PRIORITIZE_SALE",
]

QUESTIONS: dict[str, dict] = {
    "condition": {
        "type": "choice",
        "instructions": "What best describes the truck's current cold-chain condition?",
        "criteria": {
            "normal": "temperature is inside the safe range and cooling works",
            "temperature_excursion": "temperature is above the safe maximum but cooling is on",
            "refrigeration_failure": "the cooling unit is off and the cargo is warming",
            "door_left_open": "the cargo door is open or has been open",
            "sensor_fault": "a sensor reading looks implausible or frozen",
            "traffic_delay": "the truck is stopped or very slow, delaying arrival",
        },
    },
    "recommended_action": {
        "type": "choice",
        "instructions": "Which single action minimises food loss for this shipment?",
        "criteria": {
            "CONTINUE": "the shipment is fine as planned",
            "MONITOR": "keep watching, no intervention yet",
            "PREPARE_INTERVENTION": "line up an intervention but wait for confirmation",
            "DIVERT": "send the truck to a cold store now",
            "REDISTRIBUTE": "move the stock to another location after arrival",
            "PRIORITIZE_SALE": "sell this stock first because it is ageing",
        },
    },
    "urgency": {
        "type": "score",
        "instructions": "How urgent is this situation?",
        "criteria": ["watch", "soon", "immediate"],
    },
    "needs_human_review": {
        "type": "noul",
        "instructions": "Should a person review this decision before it is acted on?",
        "criteria": {
            "false": "no, the system can proceed safely",
            "true": "yes, the situation is ambiguous or high-impact",
        },
    },
    "route_delay_material": {
        "type": "noul",
        "instructions": "Is transport delay materially worsening the risk?",
        "criteria": {
            "false": "no, delay is not a material factor",
            "true": "yes, delay is materially worsening the risk",
        },
    },
}


def build_state(context: dict, result: dict) -> dict:
    """The JSON state document Laya reads, from facts the engine already has."""
    truck = context.get("truck") or {}
    batch = context.get("batch") or {}
    feat = result.get("features") or {}
    dec = result.get("decision") or {}
    truck_live = context.get("truck") or {}

    return {
        "product": batch.get("product"),
        "quantity_kg": batch.get("quantityKg"),
        "safe_min_c": batch.get("safeMinTempC"),
        "safe_max_c": batch.get("safeMaxTempC"),
        "current_temperature_c": result.get("temperatureC"),
        "thermal_exposure_c_min": result.get("thermalExposure"),
        "exposure_minutes": result.get("exposureMinutes"),
        "deterioration_fraction": result.get("deteriorationFraction"),
        "remaining_shelf_life_hours": result.get("remainingShelfLifeHours"),
        "spoilage_probability": result.get("spoilageProbability"),
        "risk_score": result.get("riskScore"),
        "risk_level": result.get("riskLevel"),
        "anomaly": result.get("anomaly"),
        "anomaly_type": result.get("anomalyType"),
        "route_delay_minutes": result.get("routeDelayMinutes"),
        "average_speed_kmh": feat.get("avgSpeedKmh"),
        "candidate_warehouses": [
            {"id": c.get("warehouseId"), "eta_min": c.get("etaMinutes"),
             "feasible": c.get("feasible"), "expected_loss_percent": c.get("expectedLossPercent")}
            for c in (result.get("optimization") or {}).get("candidates", [])
        ],
        "deterministic_decision": dec.get("action"),
        "deterministic_destination": dec.get("destinationId"),
        "route_id": truck_live.get("routeId") or truck.get("routeId"),
    }


# --------------------------------------------------------------------- client
class LayaClient:
    def __init__(self, url: str | None = None, model: str | None = None,
                 timeout: float | None = None) -> None:
        self.url = (url or settings.laya_url).rstrip("/")
        self.model = model or settings.laya_model
        self.timeout = timeout or settings.laya_timeout_s
        self._available: bool | None = None
        self._checked_at = 0.0

    @property
    def available(self) -> bool:
        """True if the service answered a no-op call. Rechecks every 30 s."""
        now = time.monotonic()
        if self._available and now - self._checked_at < 30.0:
            return True
        if self._available is False and now - self._checked_at < 30.0:
            return False
        self._available = self._ping()
        self._checked_at = now
        return self._available

    def _ping(self) -> bool:
        try:
            with httpx.Client(timeout=2.0) as http:
                # Empty questions: the server answers without a forward pass.
                r = http.post(f"{self.url}/v1/systemone",
                              json={"state": "", "questions": {}})
                return r.status_code < 500
        except Exception:
            return False

    def classify(self, state: dict, questions: dict,
                 model: str | None = None) -> dict | None:
        payload: dict = {"state": state, "questions": questions}
        chosen = model or (self.model if self.model and self.model != "router" else None)
        if chosen:
            payload["model"] = chosen
        started = time.monotonic()
        try:
            with httpx.Client(timeout=self.timeout) as http:
                r = http.post(f"{self.url}/v1/systemone", json=payload)
                r.raise_for_status()
                data = r.json()
        except Exception as exc:  # network, shape, timeout — all optional
            log.warning("Laya unavailable (%s); system-1 layer skipped", type(exc).__name__)
            return None
        return {
            "answers": data.get("answers") or {},
            "usage": data.get("usage"),
            "latencyMs": round((time.monotonic() - started) * 1000.0, 1),
        }


_default: LayaClient | None = None


def get_client() -> LayaClient:
    global _default
    if _default is None:
        _default = LayaClient()
    return _default


def set_client(client: LayaClient | None) -> None:
    """Test seam: inject a fake client (or ``None`` to reset)."""
    global _default
    _default = client


# ------------------------------------------------------------------- evaluate
def _choice(answers: dict, key: str) -> tuple[str | None, float | None]:
    entry = answers.get(key) or {}
    return entry.get("choice"), entry.get("confidence")


def _score(answers: dict, key: str) -> float | None:
    entry = answers.get(key) or {}
    value = entry.get("score")
    return float(value) if isinstance(value, (int, float)) else None


def _noul(answers: dict, key: str) -> float | None:
    entry = answers.get(key) or {}
    value = entry.get("noul")
    return float(value) if isinstance(value, (int, float)) else None


def evaluate(context: dict, result: dict, client: LayaClient | None = None) -> dict | None:
    """Run the System-1 layer. Returns ``None`` when Laya is off or unavailable."""
    if not settings.laya_enabled:
        return None
    client = client if client is not None else get_client()
    if client is None or not client.available:
        return None

    raw = client.classify(build_state(context, result), QUESTIONS)
    if not raw or not raw.get("answers"):
        return None

    answers = raw["answers"]
    condition, condition_conf = _choice(answers, "condition")
    action, action_conf = _choice(answers, "recommended_action")
    urgency = _score(answers, "urgency")
    review_p = _noul(answers, "needs_human_review")
    delay_p = _noul(answers, "route_delay_material")

    deterministic = (result.get("decision") or {}).get("action")
    return {
        "source": "laya",
        "model": getattr(client, "model", None),
        "condition": condition,
        "conditionConfidence": condition_conf,
        "action": action,
        "actionConfidence": action_conf,
        "agreesWithDecision": bool(action and deterministic and action == deterministic),
        "urgency": urgency,
        "needsHumanReview": bool(review_p is not None and review_p >= 0.5),
        "needsHumanReviewProbability": review_p,
        "routeDelayMaterialProbability": delay_p,
        "deterministicAction": deterministic,
        "answers": answers,
        "latencyMs": raw.get("latencyMs"),
        "usage": raw.get("usage"),
        # Base checkpoints ship over-confident; we say so rather than pretend.
        "calibrated": False,
        "provenance": "PREDICTED",
    }
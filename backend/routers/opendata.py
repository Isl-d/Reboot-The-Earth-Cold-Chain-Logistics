"""Open-data catalogue and provenance, served from the running system.

The platform's reference data is openly licensed. `data/opendata/provenance.json`
records what actually arrived, when, from where and under what licence, so the
licence position is checkable without leaving the API. Human-readable detail is
in `data/opendata/SOURCES.md`.
"""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter

router = APIRouter(prefix="/api/opendata", tags=["opendata"])

_DATA = Path(__file__).resolve().parents[2] / "data" / "opendata"

_DISCLAIMER = (
    "Reference and provenance data only. Measured/synthetic telemetry is "
    "separate. Literature product values in product_reference.csv are marked "
    "verified=no and must not be presented as certified food-safety thresholds."
)


@router.get("")
def opendata() -> dict:
    try:
        payload = json.loads((_DATA / "provenance.json").read_text())
    except FileNotFoundError:
        return {"available": False, "disclaimer": _DISCLAIMER, "sources": []}

    sources = [
        {"key": key, **value} for key, value in sorted(payload.get("sources", {}).items())
    ]
    return {
        "available": True,
        "generatedAt": payload.get("generatedAt"),
        "count": len(sources),
        "sources": sources,
        "sourcesDoc": "data/opendata/SOURCES.md",
        "disclaimer": _DISCLAIMER,
    }
"""Route endpoints: list, GeoJSON geometry, and per-route truck positions."""
from __future__ import annotations

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select

from ..cache import cache
from ..db import session_scope
from ..models import Route, Truck

from . import common

router = APIRouter(prefix="/api/routes", tags=["routes"])

_GEOJSON_PATH = Path(__file__).resolve().parents[2] / "data" / "routes.geojson"


def _load_geojson() -> dict:
    """Load and parse data/routes.geojson. Raises HTTPException on error."""
    try:
        with open(_GEOJSON_PATH, encoding="utf-8") as fh:
            return json.load(fh)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="routes.geojson not found")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Could not read routes.geojson: {exc}")


@router.get("")
def list_routes() -> list[dict]:
    """List all routes with summary fields."""
    try:
        with session_scope() as session:
            rows = session.execute(select(Route).order_by(Route.id)).scalars().all()
            return [
                {
                    "id": r.id,
                    "name": r.name,
                    "origin": r.origin,
                    "destination": r.destination,
                    "distance_km": r.distance_km,
                    "duration_min": r.duration_min,
                    "waypoint_count": len(r.waypoints) if r.waypoints else 0,
                }
                for r in rows
            ]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")


# NOTE: /geojson must be declared BEFORE /{route_id}/geojson to avoid shadowing.
@router.get("/geojson")
def all_routes_geojson():
    """Serve the full data/routes.geojson FeatureCollection."""
    return JSONResponse(content=_load_geojson())


@router.get("/{route_id}/geojson")
def route_geojson(route_id: str):
    """Single route geometry enriched with current truck positions."""
    fc = _load_geojson()
    feature = next(
        (f for f in fc.get("features", [])
         if f.get("properties", {}).get("route_id") == route_id),
        None,
    )
    if feature is None:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found in GeoJSON")

    # Trucks currently assigned to this route
    try:
        with session_scope() as session:
            trucks = session.execute(
                select(Truck).where(Truck.route_id == route_id)
            ).scalars().all()
            truck_features = []
            for truck in trucks:
                state = common.truck_state(truck.id)
                reading = state.get("reading")
                if reading is None:
                    row = common.last_reading(session, truck.id)
                    reading = common.reading_from_row(row) if row else None
                lat = (reading or {}).get("latitude")
                lon = (reading or {}).get("longitude")
                if lat is None or lon is None:
                    continue
                truck_features.append({
                    "type": "Feature",
                    "properties": {
                        "truckId": truck.id,
                        "name": truck.name,
                        "temperatureC": (reading or {}).get("temperatureC"),
                        "speedKmh": (reading or {}).get("speedKmh"),
                        "lastUpdated": (reading or {}).get("timestamp"),
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [lon, lat],
                    },
                })
    except Exception:
        truck_features = []

    return JSONResponse(content={
        "type": "FeatureCollection",
        "features": [feature] + truck_features,
    })


@router.get("/{route_id}/trucks")
def route_trucks(route_id: str) -> list[dict]:
    """List trucks currently assigned to this route with their latest positions."""
    try:
        with session_scope() as session:
            trucks = session.execute(
                select(Truck).where(Truck.route_id == route_id)
            ).scalars().all()
            if not trucks:
                # Verify the route exists at all
                route = session.get(Route, route_id)
                if route is None:
                    raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")
            result = []
            for truck in trucks:
                state = common.truck_state(truck.id)
                reading = state.get("reading")
                if reading is None:
                    row = common.last_reading(session, truck.id)
                    reading = common.reading_from_row(row) if row else None
                risk = state.get("risk") or {}
                result.append({
                    "truckId": truck.id,
                    "name": truck.name,
                    "lat": (reading or {}).get("latitude"),
                    "lon": (reading or {}).get("longitude"),
                    "speedKmh": (reading or {}).get("speedKmh"),
                    "temperatureC": (reading or {}).get("temperatureC"),
                    "scenario": risk.get("scenario"),
                    "batchId": truck.current_batch_id,
                    "lastUpdated": (reading or {}).get("timestamp"),
                })
            return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")

"""Route endpoints: list, GeoJSON geometry, and per-route truck positions.

The geometry is built from the ``routes`` table, which is seeded from
``data/routes.csv``: the same waypoints the simulator drives along, so the
lines on the map and the trucks on them cannot disagree.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy import select

from ..cache import cache
from ..db import session_scope
from ..models import Route, Truck

from . import common

router = APIRouter(prefix="/api/routes", tags=["routes"])


def _route_feature(route: Route) -> dict:
    return {
        "type": "Feature",
        "properties": {
            "route_id": route.id,
            "name": route.name,
            "origin": route.origin,
            "destination": route.destination,
            "distance_km": route.distance_km,
            "duration_min": route.duration_min,
            "source": "data/routes.csv",
        },
        "geometry": {
            "type": "LineString",
            # Waypoints are stored [lat, lon]; GeoJSON wants [lon, lat].
            "coordinates": [[lon, lat] for lat, lon in (route.waypoints or [])],
        },
    }


def _routes_geojson(route_id: str | None = None) -> dict:
    """Every route (or one) as a FeatureCollection. Raises 503 if the DB is down."""
    try:
        with session_scope() as session:
            query = select(Route).order_by(Route.id)
            if route_id is not None:
                query = query.where(Route.id == route_id)
            features = [_route_feature(r) for r in session.execute(query).scalars().all()]
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Database unavailable: {exc}")
    return {"type": "FeatureCollection", "features": features}


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
    """Every route as one GeoJSON FeatureCollection."""
    return JSONResponse(content=_routes_geojson())


@router.get("/{route_id}/geojson")
def route_geojson(route_id: str):
    """Single route geometry enriched with current truck positions."""
    features = _routes_geojson(route_id)["features"]
    if not features:
        raise HTTPException(status_code=404, detail=f"Route '{route_id}' not found")
    feature = features[0]

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

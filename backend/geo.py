"""Geospatial helpers: great-circle distance, route interpolation, place lookup."""
from __future__ import annotations

import math
from dataclasses import dataclass

EARTH_RADIUS_KM = 6371.0088
AVERAGE_SPEED_KMH = 45.0   # default when config is unavailable
ROAD_FACTOR = 1.25          # straight-line to road-distance conversion factor


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


@dataclass
class Place:
    place_id: str
    name: str
    type: str           # "warehouse", "cold_store", "store", "food_bank"
    lat: float
    lon: float
    has_cold_room: bool = False


class Route:
    """A route loaded from the database routes table."""

    def __init__(self, route_id: str, name: str, coords: list[list[float]],
                 distance_km: float, duration_min: float,
                 destination_id: str | None = None):
        self.id = route_id
        self.name = name
        self.coords = coords          # [[lat, lon], ...]
        self.distance_km = distance_km
        self.duration_min = duration_min
        self.destination_id = destination_id
        # cumulative pseudo-distance for interpolation (same method as fleet.py)
        self._cum = [0.0]
        for (lat1, lon1), (lat2, lon2) in zip(coords, coords[1:]):
            self._cum.append(self._cum[-1] + math.hypot(lat2 - lat1, lon2 - lon1))

    def point_at(self, frac: float) -> tuple[float, float]:
        """(lat, lon) at fraction frac (0=start, 1=end) along the route."""
        cum, coords = self._cum, self.coords
        if cum[-1] <= 0:
            return coords[0][0], coords[0][1]
        target = max(0.0, min(1.0, frac)) * cum[-1]
        for i in range(1, len(cum)):
            if cum[i] >= target:
                span = max(cum[i] - cum[i - 1], 1e-12)
                t = (target - cum[i - 1]) / span
                lat1, lon1 = coords[i - 1]
                lat2, lon2 = coords[i]
                return lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t
        return coords[-1][0], coords[-1][1]

    def remaining_km(self, frac: float) -> float:
        """Road km remaining from frac to the end."""
        return self.distance_km * max(0.0, 1.0 - frac) * ROAD_FACTOR


def drive_h(km: float) -> float:
    """Hours to drive km at average speed."""
    try:
        from .config import settings
        speed = settings.average_speed_kmh if hasattr(settings, "average_speed_kmh") else AVERAGE_SPEED_KMH
    except Exception:
        speed = AVERAGE_SPEED_KMH
    return km / max(speed, 1.0)


def load_routes() -> dict[str, Route]:
    """Load all routes from the database. Falls back to an empty dict if DB unavailable."""
    try:
        from .db import session_scope
        from .models import Route as RouteModel
        from sqlalchemy import select
        with session_scope() as session:
            rows = session.execute(select(RouteModel)).scalars().all()
            result: dict[str, Route] = {}
            for r in rows:
                waypoints = r.waypoints or []
                coords = [[float(p[0]), float(p[1])] for p in waypoints if len(p) >= 2]
                if not coords:
                    continue
                result[r.id] = Route(
                    route_id=r.id, name=r.name, coords=coords,
                    distance_km=r.distance_km, duration_min=r.duration_min,
                    destination_id=r.destination,
                )
        return result
    except Exception:
        return {}


def load_places() -> dict[str, Place]:
    """Load warehouses and stores as Places from the database."""
    try:
        from .db import session_scope
        from .models import Warehouse, Store
        from sqlalchemy import select
        places: dict[str, Place] = {}
        with session_scope() as session:
            for w in session.execute(select(Warehouse)).scalars().all():
                places[w.id] = Place(
                    place_id=w.id, name=w.name, type="warehouse",
                    lat=w.latitude, lon=w.longitude, has_cold_room=True,
                )
            for s in session.execute(select(Store)).scalars().all():
                places[s.id] = Place(
                    place_id=s.id, name=s.name, type="store",
                    lat=s.latitude, lon=s.longitude, has_cold_room=False,
                )
        return places
    except Exception:
        return {}


def nearest_place(lat: float, lon: float, types: tuple[str, ...],
                  cold_only: bool = False) -> tuple[Place | None, float]:
    """Nearest place of the given type(s) from (lat, lon). Returns (place, road_km)."""
    places = load_places()
    candidates = [
        p for p in places.values()
        if p.type in types and (not cold_only or p.has_cold_room)
    ]
    if not candidates:
        # Fall back: if asking for food_bank or cold_store, return nearest warehouse
        candidates = [p for p in places.values() if p.type == "warehouse"]
    if not candidates:
        return None, 0.0
    best = min(candidates, key=lambda p: haversine_km(lat, lon, p.lat, p.lon))
    km = haversine_km(lat, lon, best.lat, best.lon) * ROAD_FACTOR
    return best, km

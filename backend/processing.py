"""Derived values computed from the telemetry stream (Person 3 section 10).

distance · speed · temperature deviation · time above threshold ·
door duration · ETA

State is per truck and lives in memory (one backend process). It is a
running accumulator, not the authoritative record: history is in PostgreSQL.
"""
from __future__ import annotations

import threading
import datetime as dt

from .geo import haversine_km


class _TruckDerived:
    __slots__ = ("last_ts", "last_lat", "last_lon", "traveled_km",
                 "time_above_s", "door_open_s", "readings")

    def __init__(self) -> None:
        self.last_ts: dt.datetime | None = None
        self.last_lat: float | None = None
        self.last_lon: float | None = None
        self.traveled_km = 0.0
        self.time_above_s = 0.0
        self.door_open_s = 0.0
        self.readings = 0


class DerivedTracker:
    def __init__(self) -> None:
        self._state: dict[str, _TruckDerived] = {}
        self._lock = threading.Lock()

    def reset(self, truck_id: str | None = None) -> None:
        with self._lock:
            if truck_id is None:
                self._state.clear()
            else:
                self._state.pop(truck_id, None)

    def update(self, reading: dict, safe_max_c: float,
               route_distance_km: float | None) -> dict:
        truck_id = reading["truck_id"]
        ts: dt.datetime = reading["timestamp"]
        temp = reading.get("temperature_c")
        lat, lon = reading.get("latitude"), reading.get("longitude")
        speed = reading.get("speed_kmh") or 0.0

        with self._lock:
            st = self._state.setdefault(truck_id, _TruckDerived())
            interval = 0.0
            distance = 0.0
            if st.last_ts is not None:
                interval = max(0.0, (ts - st.last_ts).total_seconds())
                if None not in (st.last_lat, st.last_lon, lat, lon):
                    distance = haversine_km(st.last_lat, st.last_lon, lat, lon)
                    st.traveled_km += distance
                if temp is not None and safe_max_c is not None and temp > safe_max_c:
                    st.time_above_s += interval
                if reading.get("door_open"):
                    st.door_open_s += interval

            st.last_ts, st.last_lat, st.last_lon = ts, lat, lon
            st.readings += 1

            remaining = None
            if route_distance_km is not None:
                remaining = max(0.0, route_distance_km - st.traveled_km)

            eta_min = None
            if remaining is not None and speed > 0.5:
                eta_min = remaining / speed * 60.0

            deviation = None
            if temp is not None and safe_max_c is not None:
                deviation = max(0.0, temp - safe_max_c)

            return {
                "distance_km": round(distance, 4),
                "traveled_km": round(st.traveled_km, 4),
                "remaining_km": round(remaining, 4) if remaining is not None else None,
                "speed_kmh": round(speed, 2),
                "temperature_deviation_c": round(deviation, 2) if deviation is not None else None,
                "time_above_threshold_s": round(st.time_above_s, 1),
                "door_duration_s": round(st.door_open_s, 1),
                "eta_minutes": round(eta_min, 1) if eta_min is not None else None,
                "interval_s": round(interval, 2),
                "readings": st.readings,
            }


tracker = DerivedTracker()
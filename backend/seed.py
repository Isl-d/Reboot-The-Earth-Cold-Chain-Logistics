"""Seed the reference tables from data/*.csv (idempotent).

Run at startup after the schema is created. The same CSVs drive the simulator
so both sides always agree on trucks, routes and batches.
"""
from __future__ import annotations

import csv
import datetime as dt
import logging
from pathlib import Path

from .db import session_scope
from .models import (
    Device,
    Inventory,
    Product,
    ProductBatch,
    Route,
    Store,
    Truck,
    Warehouse,
)

log = logging.getLogger("coldchain.seed")
DATA = Path(__file__).resolve().parent.parent / "data"


def _rows(name: str) -> list[dict]:
    with open(DATA / name, newline="") as fh:
        return list(csv.DictReader(fh))


def _date(value: str) -> dt.date | None:
    return dt.date.fromisoformat(value) if value else None


def _waypoints(value: str) -> list[list[float]]:
    out: list[list[float]] = []
    for pair in value.split(";"):
        lat, lon = pair.split(",")
        out.append([float(lat), float(lon)])
    return out


def seed() -> None:
    with session_scope() as session:
        for r in _rows("products.csv"):
            session.merge(Product(
                id=r["id"], name=r["name"],
                safe_min_temp_c=float(r["safe_min_temp_c"]),
                safe_max_temp_c=float(r["safe_max_temp_c"]),
                ideal_temp_c=float(r["ideal_temp_c"]),
                initial_shelf_life_hours=float(r["initial_shelf_life_hours"]),
                value_per_kg=float(r["value_per_kg"]),
                activation_energy_j_mol=float(r.get("activation_energy_j_mol") or 80000.0),
                humidity_limit_pct=float(r.get("humidity_limit_pct") or 90.0),
            ))
        session.flush()

        for r in _rows("warehouses.csv"):
            session.merge(Warehouse(
                id=r["id"], name=r["name"], latitude=float(r["latitude"]),
                longitude=float(r["longitude"]), capacity_kg=float(r["capacity_kg"]),
                available_capacity_kg=float(r["available_capacity_kg"]),
                min_temp_c=float(r["min_temp_c"]), max_temp_c=float(r["max_temp_c"]),
            ))
        session.flush()

        for r in _rows("stores.csv"):
            session.merge(Store(
                id=r["id"], name=r["name"], latitude=float(r["latitude"]),
                longitude=float(r["longitude"]), capacity_kg=float(r["capacity_kg"]),
            ))

        for r in _rows("routes.csv"):
            session.merge(Route(
                id=r["id"], name=r["name"], origin=r["origin"],
                destination=r["destination"], waypoints=_waypoints(r["waypoints"]),
                distance_km=float(r["distance_km"]), duration_min=float(r["duration_min"]),
            ))
        session.flush()

        for r in _rows("product_batches.csv"):
            session.merge(ProductBatch(
                id=r["id"], product_id=r["product_id"], quantity_kg=float(r["quantity_kg"]),
                production_date=_date(r["production_date"]), expiry_date=_date(r["expiry_date"]),
                safe_min_temp_c=float(r["safe_min_temp_c"]),
                safe_max_temp_c=float(r["safe_max_temp_c"]),
                initial_shelf_life_hours=float(r["initial_shelf_life_hours"]),
                warehouse_id=r["warehouse_id"] or None,
            ))
        session.flush()

        for r in _rows("trucks.csv"):
            session.merge(Truck(
                id=r["id"], name=r["name"], device_id=r["device_id"],
                route_id=r["route_id"], current_batch_id=r["current_batch_id"] or None,
                status="active",
            ))
        # Devices reference trucks, so the truck rows must exist first. Without
        # this flush SQLAlchemy may batch the two inserts out of order, which
        # PostgreSQL (unlike default SQLite) rejects with a foreign-key error.
        session.flush()
        for r in _rows("trucks.csv"):
            session.merge(Device(
                id=r["device_id"], truck_id=r["id"], kind="dht_gps", status="offline",
            ))

        for r in _rows("inventory.csv"):
            session.merge(Inventory(
                id=r["id"], batch_id=r["batch_id"], location_type=r["location_type"],
                location_id=r["location_id"], quantity_kg=float(r["quantity_kg"]),
                expiry_date=_date(r["expiry_date"]), status=r["status"],
            ))
    log.info("reference tables seeded from %s", DATA)
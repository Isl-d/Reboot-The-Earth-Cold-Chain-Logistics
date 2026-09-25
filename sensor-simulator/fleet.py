"""Fleet definitions for the simulator: trucks, routes, products, batches.

Reads the same ``data/*.csv`` files the backend seeds from, so the simulator
and the database can never drift apart.
"""
from __future__ import annotations

import csv
import math
import os

DATA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "data")
MAP_SPEED = 10.0  # positions animate this much faster than shelf life, for the demo


def _rows(name):
    with open(os.path.join(DATA, name), newline="") as fh:
        return list(csv.DictReader(fh))


def load_routes():
    routes = {}
    for r in _rows("routes.csv"):
        coords = []
        for pair in r["waypoints"].split(";"):
            lat, lon = pair.split(",")
            coords.append([float(lat), float(lon)])
        cum = [0.0]
        for (lat1, lon1), (lat2, lon2) in zip(coords, coords[1:]):
            cum.append(cum[-1] + math.hypot(lat2 - lat1, lon2 - lon1))
        routes[r["id"]] = {
            "id": r["id"], "name": r["name"], "coords": coords, "cum": cum,
            "distance_km": float(r["distance_km"]), "duration_min": float(r["duration_min"]),
        }
    return routes


def load_products():
    return {r["id"]: r for r in _rows("products.csv")}


def load_batches():
    return {r["id"]: r for r in _rows("product_batches.csv")}


def load_trucks():
    routes = load_routes()
    products = load_products()
    batches = load_batches()
    trucks = []
    for i, r in enumerate(_rows("trucks.csv")):
        batch = batches.get(r["current_batch_id"])
        product = products.get(batch["product_id"]) if batch else None
        trucks.append({
            "id": r["id"],
            "name": r["name"],
            "device_id": r["device_id"],
            "route_id": r["route_id"],
            "batch_id": batch["id"] if batch else None,
            "product_id": product["id"] if product else None,
            "safe_min": float(batch["safe_min_temp_c"]) if batch else 0.0,
            "safe_max": float(batch["safe_max_temp_c"]) if batch else 4.0,
            "ideal": float(product["ideal_temp_c"]) if product else 2.0,
            "shelf_life_hours": float(batch["initial_shelf_life_hours"]) if batch else 168.0,
            "quantity_kg": float(batch["quantity_kg"]) if batch else 0.0,
            "route": routes[r["route_id"]],
            "start_frac": (i * 0.18) % 0.85,
        })
    return trucks, routes


def point_at(route, frac):
    cum, coords = route["cum"], route["coords"]
    if cum[-1] <= 0:
        lat, lon = coords[0]
        return lat, lon
    target = frac * cum[-1]
    for i in range(1, len(cum)):
        if cum[i] >= target:
            span = max(cum[i] - cum[i - 1], 1e-12)
            t = (target - cum[i - 1]) / span
            (lat1, lon1), (lat2, lon2) = coords[i - 1], coords[i]
            return lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t
    return coords[-1][0], coords[-1][1]
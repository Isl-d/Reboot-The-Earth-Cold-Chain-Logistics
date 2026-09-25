"""SQLAlchemy models for the cold-chain data platform.

Tables (Person 3 brief): trucks, devices, sensor_readings, products,
product_batches, warehouses, stores, routes, inventory, incidents,
simulation_runs — plus two the brief implies but does not name:
``ingest_rejects`` (data quality is logged, never silently dropped) and
``predictions`` (the Person 4 hand-off store).

``sensor_readings`` has a composite primary key ``(device_id, ts)`` so the
same table can become a TimescaleDB hypertable: every unique constraint on a
hypertable must include the partitioning column, ``ts``.
"""
from __future__ import annotations

import datetime as dt

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    PrimaryKeyConstraint,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

# JSONB on PostgreSQL (indexable, what production uses); plain JSON everywhere
# else. This is what lets the test suite and scripts/dev_no_broker.py run the
# exact same models on SQLite without a server.
JSONType = JSON().with_variant(JSONB, "postgresql")


class Truck(Base):
    __tablename__ = "trucks"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    device_id: Mapped[str] = mapped_column(String, nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String, nullable=False, default="active")
    route_id: Mapped[str | None] = mapped_column(ForeignKey("routes.id"))
    current_batch_id: Mapped[str | None] = mapped_column(ForeignKey("product_batches.id"))
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    truck_id: Mapped[str] = mapped_column(ForeignKey("trucks.id"), nullable=False)
    kind: Mapped[str] = mapped_column(String, nullable=False, default="dht_gps")
    status: Mapped[str] = mapped_column(String, nullable=False, default="online")
    last_seen_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class DeviceEvent(Base):
    """A typed thing a device reported between telemetry ticks.

    Telemetry says "what the sensors read"; an event says "what happened"
    (a door opened, the unit tripped). It explains the reading that follows
    and is never used to drive a duration threshold — it has no duration.
    """
    __tablename__ = "device_events"
    __table_args__ = (Index("ix_device_events_truck_ts", "truck_id", "ts"),)

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    ts: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), index=True)
    truck_id: Mapped[str] = mapped_column(String, nullable=False)
    device_id: Mapped[str | None] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, nullable=False)
    detail: Mapped[str] = mapped_column(Text, default="")
    value: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SensorReading(Base):
    __tablename__ = "sensor_readings"
    __table_args__ = (
        PrimaryKeyConstraint("device_id", "ts"),
        Index("ix_sensor_readings_truck_ts", "truck_id", "ts"),
    )

    device_id: Mapped[str] = mapped_column(String, nullable=False)
    truck_id: Mapped[str] = mapped_column(String, nullable=False)
    ts: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    temperature_c: Mapped[float | None] = mapped_column(Float)
    humidity_pct: Mapped[float | None] = mapped_column(Float)
    latitude: Mapped[float | None] = mapped_column(Float)
    longitude: Mapped[float | None] = mapped_column(Float)
    speed_kmh: Mapped[float | None] = mapped_column(Float)
    g_force: Mapped[float | None] = mapped_column(Float)
    door_open: Mapped[bool] = mapped_column(Boolean, default=False)
    refrigeration_on: Mapped[bool] = mapped_column(Boolean, default=True)
    valid: Mapped[bool] = mapped_column(Boolean, default=True)
    src: Mapped[str] = mapped_column(String, default="sim")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class IngestReject(Base):
    __tablename__ = "ingest_rejects"

    id: Mapped[int] = mapped_column(
        BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True
    )
    ts: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))
    device_id: Mapped[str | None] = mapped_column(String)
    truck_id: Mapped[str | None] = mapped_column(String)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    payload: Mapped[dict | None] = mapped_column(JSONType)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Product(Base):
    __tablename__ = "products"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    safe_min_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    safe_max_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    ideal_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    initial_shelf_life_hours: Mapped[float] = mapped_column(Float, nullable=False)
    value_per_kg: Mapped[float] = mapped_column(Float, nullable=False)
    # Deterioration-model parameters live with the product: configuration,
    # never scattered constants in the maths.
    activation_energy_j_mol: Mapped[float] = mapped_column(Float, nullable=False, default=80000.0)
    humidity_limit_pct: Mapped[float] = mapped_column(Float, nullable=False, default=90.0)


class ProductBatch(Base):
    __tablename__ = "product_batches"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("products.id"), nullable=False)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    production_date: Mapped[dt.date | None] = mapped_column(Date)
    expiry_date: Mapped[dt.date | None] = mapped_column(Date)
    safe_min_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    safe_max_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    initial_shelf_life_hours: Mapped[float] = mapped_column(Float, nullable=False)
    warehouse_id: Mapped[str | None] = mapped_column(ForeignKey("warehouses.id"))


class Warehouse(Base):
    __tablename__ = "warehouses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    available_capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    min_temp_c: Mapped[float] = mapped_column(Float, nullable=False)
    max_temp_c: Mapped[float] = mapped_column(Float, nullable=False)


class Store(Base):
    __tablename__ = "stores"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)


class Route(Base):
    __tablename__ = "routes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    origin: Mapped[str | None] = mapped_column(String)
    destination: Mapped[str | None] = mapped_column(String)
    waypoints: Mapped[list | None] = mapped_column(JSONType)
    distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    duration_min: Mapped[float] = mapped_column(Float, nullable=False)


class Inventory(Base):
    __tablename__ = "inventory"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    batch_id: Mapped[str] = mapped_column(ForeignKey("product_batches.id"), nullable=False)
    location_type: Mapped[str] = mapped_column(String, nullable=False)  # warehouse | store
    location_id: Mapped[str] = mapped_column(String, nullable=False)
    quantity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    expiry_date: Mapped[dt.date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String, nullable=False, default="in_stock")
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    truck_id: Mapped[str] = mapped_column(String, nullable=False)
    batch_id: Mapped[str | None] = mapped_column(String)
    type: Mapped[str] = mapped_column(String, nullable=False)
    severity: Mapped[str] = mapped_column(String, nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="OPEN")
    risk_score: Mapped[float | None] = mapped_column(Float)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    truck_id: Mapped[str | None] = mapped_column(String)
    scenario: Mapped[str] = mapped_column(String, nullable=False)
    speed_multiplier: Mapped[float] = mapped_column(Float, default=1.0)
    status: Mapped[str] = mapped_column(String, nullable=False, default="running")
    started_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    stopped_at: Mapped[dt.datetime | None] = mapped_column(DateTime(timezone=True))


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    truck_id: Mapped[str] = mapped_column(String, nullable=False)
    batch_id: Mapped[str | None] = mapped_column(String)
    thermal_exposure: Mapped[float | None] = mapped_column(Float)
    remaining_shelf_life_hours: Mapped[float | None] = mapped_column(Float)
    spoilage_probability: Mapped[float | None] = mapped_column(Float)
    confidence: Mapped[float | None] = mapped_column(Float)
    risk_score: Mapped[float | None] = mapped_column(Float)
    risk_level: Mapped[str | None] = mapped_column(String)
    recommendation: Mapped[dict | None] = mapped_column(JSONType)
    # The full unified intelligence response, so GET /api/predictions/{batchId}
    # can return exactly what the engine produced without re-running the LLM.
    result: Mapped[dict | None] = mapped_column(JSONType)
    model_version: Mapped[str] = mapped_column(String, default="person4")
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_predictions_truck_created", "truck_id", "created_at"),)


class Action(Base):
    """An executed operational action — the point where intelligence acts.

    The recommendation is advice; an Action is the recorded, auditable fact that
    someone (or the auto-pilot) acted on it: a diversion dispatched, stock
    prioritised for sale, an incident acknowledged.
    """
    __tablename__ = "actions"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    truck_id: Mapped[str | None] = mapped_column(String)
    batch_id: Mapped[str | None] = mapped_column(String)
    action: Mapped[str] = mapped_column(String, nullable=False)
    destination_id: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False, default="EXECUTED")
    source: Mapped[str] = mapped_column(String, nullable=False, default="operator")  # operator | auto
    detail: Mapped[dict | None] = mapped_column(JSONType)
    created_at: Mapped[dt.datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (Index("ix_actions_truck_created", "truck_id", "created_at"),)
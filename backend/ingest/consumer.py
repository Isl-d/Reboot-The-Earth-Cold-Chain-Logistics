"""The MQTT consumer: the only way telemetry enters the platform.

    MQTT → validate → normalize → PostgreSQL + Redis → incidents → WebSocket

Runs on paho's network thread. Reference data (devices, trucks, batches,
routes) is loaded once into memory so the hot path does no joins.
"""
from __future__ import annotations

import datetime as dt
import json
import logging
import threading
import uuid

from sqlalchemy import select

from .. import cache as cache_mod
from .. import processing, risk as risk_mod
from ..config import settings
from ..db import session_scope
from ..intelligence import engine as intelligence_engine
from ..models import Device, DeviceEvent, Incident, IngestReject, ProductBatch, Route, SensorReading, Truck
from ..ws import manager
from . import incidents as incident_rules
from .events import normalize_event
from .normalize import normalize, to_wire
from .validate import validate

log = logging.getLogger("coldchain.ingest")


class Pipeline:
    def __init__(self) -> None:
        self.client = None
        self._stop = threading.Event()
        self.device_to_truck: dict[str, str] = {}
        self.truck_info: dict[str, dict] = {}
        self.cache = cache_mod.cache

    # --------------------------------------------------------- reference data
    def load_reference(self) -> None:
        with session_scope() as session:
            devices = session.execute(select(Device)).scalars().all()
            self.device_to_truck = {d.id: d.truck_id for d in devices}

            trucks = session.execute(select(Truck)).scalars().all()
            routes = {r.id: r for r in session.execute(select(Route)).scalars().all()}
            info: dict[str, dict] = {}
            for t in trucks:
                batch = session.get(ProductBatch, t.current_batch_id) if t.current_batch_id else None
                route = routes.get(t.route_id) if t.route_id else None
                info[t.id] = {
                    "truck_id": t.id,
                    "name": t.name,
                    "device_id": t.device_id,
                    "route_id": t.route_id,
                    "route_distance_km": route.distance_km if route else None,
                    "batch_id": batch.id if batch else None,
                    "product_id": batch.product_id if batch else None,
                    "quantity_kg": batch.quantity_kg if batch else None,
                    "safe_min_temp_c": batch.safe_min_temp_c if batch else None,
                    "safe_max_temp_c": batch.safe_max_temp_c if batch else None,
                    "initial_shelf_life_hours": batch.initial_shelf_life_hours if batch else None,
                    "expiry_date": batch.expiry_date if batch else None,
                }
            self.truck_info = info
        log.info("reference loaded: %d devices, %d trucks", len(self.device_to_truck), len(self.truck_info))

    # ----------------------------------------------------------------- MQTT
    def start(self) -> None:
        try:
            import paho.mqtt.client as mqtt
        except ImportError:  # pragma: no cover
            log.error("paho-mqtt not installed; no telemetry will arrive")
            return
        self.client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2,
                                  client_id=settings.mqtt_client_id)
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.reconnect_delay_set(min_delay=1, max_delay=10)
        try:
            self.client.connect_async(settings.mqtt_host, settings.mqtt_port, keepalive=30)
            self.client.loop_start()
            log.info("MQTT connecting to %s:%s", settings.mqtt_host, settings.mqtt_port)
        except Exception as exc:  # pragma: no cover
            log.warning("MQTT unavailable (%s); the API still serves stored data", exc)

    def stop(self) -> None:
        self._stop.set()
        if self.client is not None:
            try:
                self.client.loop_stop()
                self.client.disconnect()
            except Exception:
                pass

    def publish_control(self, truck_id: str, message: dict) -> bool:
        if self.client is None:
            return False
        topic = settings.control_topic.format(truck_id=truck_id)
        self.client.publish(topic, json.dumps(message))
        return True

    def _on_connect(self, client, _userdata, _flags, reason_code, _props=None) -> None:
        log.info("MQTT connected (%s)", reason_code)
        client.subscribe(settings.telemetry_topic, qos=0)
        client.subscribe(settings.events_topic, qos=0)

    def _on_message(self, _client, _userdata, msg) -> None:
        try:
            payload = json.loads(msg.payload or b"{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            log.warning("dropped non-JSON message on %s", msg.topic)
            return
        topic = msg.topic
        # paho-mqtt 2.x re-raises callback exceptions, which kills its network
        # thread: one bad message (e.g. "database is locked") would silently
        # stop the whole live feed. Drop the message, keep the feed.
        try:
            if topic.endswith("/telemetry"):
                self.handle(payload)
            elif topic.endswith("/events"):
                truck_id = topic.split("/")[-2] if topic.count("/") >= 2 else None
                self.handle_event(payload, truck_id)
        except Exception:
            log.exception("failed to process message on %s; feed continues", topic)

    # ----------------------------------------------------------- device events
    def handle_event(self, raw: dict, truck_id: str | None = None) -> dict | None:
        """Persist and forward one typed device event. Returns its wire form."""
        event, reasons = normalize_event(raw, truck_id)
        if event is None:
            log.warning("rejected device event: %s | %s", "; ".join(reasons), str(raw)[:200])
            return None

        with session_scope() as session:
            session.add(DeviceEvent(
                ts=event["timestamp"], truck_id=event["truckId"],
                device_id=event["deviceId"], type=event["type"],
                detail=event["detail"], value=event["value"],
            ))

        wire = {
            "truckId": event["truckId"],
            "deviceId": event["deviceId"],
            "timestamp": event["timestamp"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            "type": event["type"],
            "detail": event["detail"],
            "value": event["value"],
        }
        manager.broadcast_threadsafe({"event": "DEVICE_EVENT", **wire})
        return wire

    # -------------------------------------------------------------- pipeline
    def handle(self, raw: dict) -> None:
        known = set(self.device_to_truck)
        model, reasons = validate(raw, known)
        if model is None:
            self._reject(raw, reasons)
            return

        truck_id = self.device_to_truck[model.deviceId]
        reading = normalize(model, truck_id)
        info = self.truck_info.get(truck_id, {})
        safe_max = info.get("safe_max_temp_c")

        derived = processing.tracker.update(
            reading, safe_max if safe_max is not None else 1e9,
            info.get("route_distance_km"),
        )
        risk = risk_mod.baseline_risk(reading, derived, safe_max)

        self._store(reading)
        self.cache.set_truck_state(truck_id, to_wire(reading), derived, risk)

        self._reconcile_incidents(truck_id, info.get("batch_id"), reading, derived, safe_max)

        manager.broadcast_threadsafe({
            "event": "TRUCK_STATE_UPDATED",
            **to_wire(reading),
            "riskScore": risk["riskScore"],
            "riskLevel": risk["riskLevel"],
        })

        # A new reading invalidates the cached computed snapshot, then the
        # Person 4 engine is queued off the hot path.
        intelligence_engine.clear_snapshots(truck_id)
        intelligence_engine.mark_dirty(truck_id)

    # --------------------------------------------------------------- storage
    def _store(self, reading: dict) -> None:
        with session_scope() as session:
            session.merge(SensorReading(
                device_id=reading["device_id"],
                truck_id=reading["truck_id"],
                ts=reading["timestamp"],
                temperature_c=reading["temperature_c"],
                humidity_pct=reading["humidity_pct"],
                latitude=reading["latitude"],
                longitude=reading["longitude"],
                speed_kmh=reading["speed_kmh"],
                g_force=reading["g_force"],
                door_open=reading["door_open"],
                refrigeration_on=reading["refrigeration_on"],
                valid=True,
                src=reading["src"],
            ))
            session.execute(
                Device.__table__.update()
                .where(Device.id == reading["device_id"])
                .values(last_seen_at=reading["timestamp"], status="online")
            )

    def _reject(self, raw: dict, reasons: list[str]) -> None:
        reason = "; ".join(reasons)
        log.warning("rejected reading: %s | %s", reason, json.dumps(raw)[:300])
        with session_scope() as session:
            session.add(IngestReject(
                ts=self._parse_ts(raw.get("timestamp")),
                device_id=raw.get("deviceId"),
                truck_id=raw.get("truckId"),
                reason=reason,
                payload=raw,
            ))

    @staticmethod
    def _parse_ts(value) -> dt.datetime | None:
        if not isinstance(value, str):
            return None
        try:
            return dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None

    # --------------------------------------------------------------- incidents
    def _reconcile_incidents(self, truck_id: str, batch_id: str | None,
                             reading: dict, derived: dict, safe_max: float | None) -> None:
        want = incident_rules.desired(reading, derived, safe_max)
        now = dt.datetime.now(dt.timezone.utc)

        with session_scope() as session:
            open_rows = session.execute(
                select(Incident).where(Incident.truck_id == truck_id, Incident.status == "OPEN")
            ).scalars().all()
            open_by_type = {i.type: i for i in open_rows}

            for itype, spec in want.items():
                existing = open_by_type.pop(itype, None)
                if existing is None:
                    incident_id = f"INC-{uuid.uuid4().hex[:8].upper()}"
                    row = Incident(
                        id=incident_id, truck_id=truck_id, batch_id=batch_id, type=itype,
                        severity=spec["severity"], message=spec["message"], status="OPEN",
                        risk_score=None, updated_at=now,
                    )
                    session.add(row)
                    payload = self._incident_payload(row)
                    self.cache.set_active_incident(payload)
                    manager.broadcast_threadsafe({"event": "INCIDENT_CREATED", **payload})
                elif existing.severity != spec["severity"]:
                    existing.severity = spec["severity"]
                    existing.updated_at = now
                    payload = self._incident_payload(existing)
                    self.cache.set_active_incident(payload)
                    manager.broadcast_threadsafe({"event": "INCIDENT_UPDATED", **payload})

            for stale in open_by_type.values():
                stale.status = "RESOLVED"
                stale.updated_at = now
                payload = self._incident_payload(stale)
                self.cache.close_active_incident(stale.id)
                manager.broadcast_threadsafe({"event": "INCIDENT_UPDATED", **payload})

    @staticmethod
    def _incident_payload(row: Incident) -> dict:
        created = row.created_at or dt.datetime.now(dt.timezone.utc)
        return {
            "id": row.id,
            "truckId": row.truck_id,
            "batchId": row.batch_id,
            "type": row.type,
            "severity": row.severity,
            "message": row.message,
            "status": row.status,
            "createdAt": created.isoformat(),
        }


pipeline = Pipeline()
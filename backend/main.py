"""FastAPI application: REST + WebSocket for the cold-chain data platform.

Startup: create the schema, load reference data, start the MQTT consumer and
bind the event loop for thread-safe WebSocket fan-out.
"""
from __future__ import annotations

import asyncio
import contextlib
import logging

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .cache import cache
from .config import settings
from .db import health as db_health
from .db import init_db
from .ingest.consumer import pipeline
from .intelligence.worker import worker as intelligence_worker
from .routers import events, incidents, intelligence, internal, inventory, model, opendata, routes, simulation, telemetry, trucks, warehouses
from .routers.trucks import fleet_snapshot
from .seed import seed
from .ws import manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)-7s %(name)s: %(message)s",
)
log = logging.getLogger("coldchain.main")


@contextlib.asynccontextmanager
async def lifespan(_app: FastAPI):
    manager.bind_loop(asyncio.get_running_loop())
    try:
        init_db()
        seed()
    except Exception as exc:  # pragma: no cover - demo safety
        log.warning("database unavailable at startup (%s); serving without it", exc)
    try:
        pipeline.load_reference()
    except Exception as exc:  # pragma: no cover
        log.warning("reference data unavailable (%s); is the database seeded?", exc)
    pipeline.start()
    if settings.intelligence_enabled:
        intelligence_worker.start()
    yield
    if intelligence_worker.is_alive():
        intelligence_worker.stop()
    pipeline.stop()


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

_origins = [o.strip() for o in settings.cors_origins.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(trucks.router)
app.include_router(telemetry.router)
app.include_router(warehouses.router)
app.include_router(inventory.router)
app.include_router(incidents.router)
app.include_router(events.router)
app.include_router(opendata.router)
app.include_router(routes.router)
app.include_router(simulation.router)
app.include_router(internal.router)
app.include_router(intelligence.router)
app.include_router(model.router)


@app.get("/", tags=["meta"])
def root() -> dict:
    return {
        "name": settings.app_name,
        "endpoints": {
            "trucks": "/api/trucks",
            "telemetry": "/api/trucks/{truckId}/telemetry",
            "warehouses": "/api/warehouses",
            "inventory": "/api/inventory",
            "incidents": "/api/incidents",
            "simulation": "/api/simulation/scenario",
            "websocket": "/ws/live",
            "context_for_person4": "/api/internal/context/{truckId}",
            "predictions": "/api/predictions/{batchId}",
            "risk": "/api/risk/{batchId}",
            "optimization": "/api/optimization/{batchId}",
            "food_loss": "/api/analytics/food-loss",
            "inventory_analytics": "/api/analytics/inventory",
            "explain": "/api/ai/explain",
            "recommendations": "/api/recommendations/{batchId}",
            "docs": "/docs",
        },
    }


@app.get("/healthz", tags=["meta"])
def healthz() -> dict:
    return {
        "status": "ok",
        "database": db_health(),
        "redis": cache.using_redis,
        "mqtt": pipeline.client is not None,
        "trucks": len(pipeline.truck_info),
    }


@app.websocket("/ws/live")
async def ws_live(socket: WebSocket) -> None:
    await manager.connect(socket)
    try:
        # HELLO carries the current fleet so a client that connects mid-demo
        # paints the map immediately instead of waiting for the next tick.
        await socket.send_json({"event": "HELLO", "trucks": fleet_snapshot()})
    except Exception:
        pass
    try:
        while True:
            await socket.receive_text()  # client keep-alive; content ignored
    except WebSocketDisconnect:
        manager.disconnect(socket)
    except Exception:
        manager.disconnect(socket)
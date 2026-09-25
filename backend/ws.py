"""WebSocket fan-out for /ws/live.

The MQTT consumer runs on a background thread, so it cannot await directly.
It captures the server's event loop at startup and hands messages to
``broadcast_threadsafe``; the loop does the actual sending.
"""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from fastapi import WebSocket

log = logging.getLogger("coldchain.ws")


class ConnectionManager:
    def __init__(self) -> None:
        self.active: set[WebSocket] = set()
        self.loop: asyncio.AbstractEventLoop | None = None

    def bind_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self.loop = loop

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.active.add(ws)
        log.info("websocket connected (%d live)", len(self.active))

    def disconnect(self, ws: WebSocket) -> None:
        self.active.discard(ws)
        log.info("websocket disconnected (%d live)", len(self.active))

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.active):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active.discard(ws)

    def broadcast_threadsafe(self, message: dict[str, Any]) -> None:
        if self.loop is None or not self.active:
            return
        try:
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self.loop)
        except Exception as exc:  # pragma: no cover
            log.warning("broadcast failed: %s", exc)


manager = ConnectionManager()
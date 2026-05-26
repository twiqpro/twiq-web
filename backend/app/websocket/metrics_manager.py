from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastapi import WebSocket

from app.feed.dhan_feed import DhanFeedClient, REQUEST_SUBSCRIBE_QUOTE
from app.feed.binary_parser import FeedEvent
from app.market.metrics_aggregator import NiftyMetricsAggregator

logger = logging.getLogger(__name__)

BROADCAST_INTERVAL_SEC = 0.5


class NiftyMetricsConnectionManager:
    """Fan-out live NIFTY option metrics to browsers; one Dhan quote feed upstream."""

    def __init__(self) -> None:
        self.clients: list[WebSocket] = []
        self._aggregator = NiftyMetricsAggregator()
        self._feed_task: Optional[asyncio.Task[None]] = None
        self._broadcast_task: Optional[asyncio.Task[None]] = None
        self._feed_client: Optional[DhanFeedClient] = None
        self._lock = asyncio.Lock()
        self._bootstrapped = False

    async def connect(self, websocket: WebSocket, expiry: Optional[str] = None) -> None:
        await websocket.accept()
        async with self._lock:
            if websocket not in self.clients:
                self.clients.append(websocket)

            if not self._bootstrapped:
                await self._aggregator.bootstrap(expiry=expiry)
                self._bootstrapped = True

            snap = self._aggregator.get_snapshot()
            if snap:
                await websocket.send_json(
                    {
                        "type": "metrics_snapshot",
                        "symbol": "NIFTY",
                        "metrics": snap.model_dump(),
                    }
                )

            if self._feed_task is None or self._feed_task.done():
                self._feed_task = asyncio.create_task(self._run_feed())
            if self._broadcast_task is None or self._broadcast_task.done():
                self._broadcast_task = asyncio.create_task(self._broadcast_loop())

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.clients:
                self.clients.remove(websocket)
            if not self.clients:
                if self._feed_task:
                    self._feed_task.cancel()
                    self._feed_task = None
                if self._broadcast_task:
                    self._broadcast_task.cancel()
                    self._broadcast_task = None
                if self._feed_client:
                    await self._feed_client.disconnect()
                    self._feed_client = None

    async def ensure_bootstrapped(self, expiry: Optional[str] = None) -> None:
        if not self._bootstrapped:
            await self._aggregator.bootstrap(expiry=expiry)
            self._bootstrapped = True

    async def get_snapshot(self, expiry: Optional[str] = None) -> dict[str, Any]:
        await self.ensure_bootstrapped(expiry=expiry)
        return self._aggregator.snapshot_dict()

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            await self.disconnect(ws)

    async def _on_feed_event(self, event: FeedEvent) -> None:
        await self._aggregator.apply_feed_event(event)

    async def _broadcast_loop(self) -> None:
        try:
            while True:
                await asyncio.sleep(BROADCAST_INTERVAL_SEC)
                if not self.clients:
                    continue
                snap = self._aggregator.get_snapshot()
                if not snap:
                    continue
                await self.broadcast(
                    {
                        "type": "metrics_update",
                        "symbol": "NIFTY",
                        "metrics": snap.model_dump(),
                    }
                )
        except asyncio.CancelledError:
            pass

    async def _run_feed(self) -> None:
        try:
            instruments = self._aggregator.feed_instruments
            self._feed_client = DhanFeedClient()
            await self.broadcast(
                {
                    "type": "status",
                    "symbol": "NIFTY",
                    "message": "subscribing_metrics_feed",
                    "instrument_count": len(instruments),
                }
            )

            async def on_event(event: FeedEvent) -> None:
                await self._on_feed_event(event)

            await self._feed_client.run_with_reconnect(
                on_event,
                instruments=instruments,
                request_code=REQUEST_SUBSCRIBE_QUOTE,
            )
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.exception("Metrics feed error: %s", exc)
            await self.broadcast(
                {"type": "error", "symbol": "NIFTY", "message": str(exc)}
            )


metrics_manager = NiftyMetricsConnectionManager()

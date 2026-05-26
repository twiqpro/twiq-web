from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from fastapi import WebSocket

from app.feed.binary_parser import MarketTick
from app.feed.dhan_feed import DhanFeedClient, FeedInstrument, REQUEST_SUBSCRIBE_TICKER
from app.indicators.candle_aggregator import CandleAggregator
from app.market.nifty import get_nifty_instrument

logger = logging.getLogger(__name__)


class NiftyConnectionManager:
    """Fan-out realtime NIFTY candles to browser clients; one Dhan feed upstream."""

    def __init__(self) -> None:
        self.clients: list[WebSocket] = []
        self._feed_task: Optional[asyncio.Task[None]] = None
        self._aggregator: Optional[CandleAggregator] = None
        self._timeframe: str = "5M"
        self._tick_count = 0
        self._feed_client: Optional[DhanFeedClient] = None
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, timeframe: str = "5M") -> None:
        await websocket.accept()

        tf = timeframe.upper()
        async with self._lock:
            if tf != self._timeframe or self._aggregator is None:
                self._timeframe = tf
                self._aggregator = CandleAggregator(self._timeframe)
                self._tick_count = 0

            self.clients.append(websocket)

            await websocket.send_json(
                {
                    "type": "status",
                    "symbol": "NIFTY",
                    "message": "connected",
                    "timeframe": self._timeframe,
                }
            )

            if self._feed_task is None or self._feed_task.done():
                self._feed_task = asyncio.create_task(self._run_feed())

    async def disconnect(self, websocket: WebSocket) -> None:
        async with self._lock:
            if websocket in self.clients:
                self.clients.remove(websocket)
            if not self.clients and self._feed_task:
                self._feed_task.cancel()
                self._feed_task = None
                if self._feed_client:
                    await self._feed_client.disconnect()
                    self._feed_client = None

    async def broadcast(self, message: dict[str, Any]) -> None:
        dead: list[WebSocket] = []
        for ws in list(self.clients):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)

        for ws in dead:
            await self.disconnect(ws)

    async def _on_feed_event(self, event: Any) -> None:
        if not isinstance(event, MarketTick):
            return
        tick = event
        if not self._aggregator:
            return

        closed = self._aggregator.add_tick(tick.price, tick.volume, tick.timestamp)

        if closed:
            await self.broadcast(
                {
                    "type": "candle_complete",
                    "symbol": "NIFTY",
                    "candle": closed.to_dict(),
                    "ltp": tick.price,
                }
            )

        self._tick_count += 1
        if self._tick_count % 3 == 0:
            partial = self._aggregator.partial()
            if partial:
                await self.broadcast(
                    {
                        "type": "candle_update",
                        "symbol": "NIFTY",
                        "candle": partial.to_dict(),
                        "ltp": tick.price,
                        "open_interest": getattr(tick, "open_interest", None),
                    }
                )

    async def _run_feed(self) -> None:
        try:
            nifty = await get_nifty_instrument()
            self._feed_client = DhanFeedClient()
            await self.broadcast(
                {
                    "type": "status",
                    "symbol": "NIFTY",
                    "message": "subscribing_to_dhan_feed",
                    "security_id": nifty.security_id,
                    "exchange_segment": nifty.exchange_segment,
                }
            )
            instruments = [
                FeedInstrument(
                    exchange_segment=nifty.exchange_segment,
                    security_id=str(nifty.security_id),
                )
            ]
            await self._feed_client.run_with_reconnect(
                self._on_feed_event,
                instruments=instruments,
                request_code=REQUEST_SUBSCRIBE_TICKER,
            )
        except asyncio.CancelledError:
            pass
        except Exception as exc:
            logger.exception("NIFTY feed error: %s", exc)
            await self.broadcast(
                {"type": "error", "symbol": "NIFTY", "message": str(exc)}
            )


manager = NiftyConnectionManager()


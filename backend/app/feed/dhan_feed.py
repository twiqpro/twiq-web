from __future__ import annotations

import asyncio
import json
import logging
from dataclasses import dataclass
from typing import Awaitable, Callable, Optional
from urllib.parse import urlencode

import websockets
from websockets.client import WebSocketClientProtocol

from app.auth.dhanhq_oauth import DhanHQAuthError, DhanHQOAuth
from app.config import Settings, get_settings
from app.feed.binary_parser import FeedEvent, parse_feed_event
from app.market.nifty import NiftyInstrument

logger = logging.getLogger(__name__)

OnFeedEventCallback = Callable[[FeedEvent], Awaitable[None]]

# Dhan v2 feed request codes
REQUEST_SUBSCRIBE_TICKER = 15
REQUEST_SUBSCRIBE_QUOTE = 17
REQUEST_SUBSCRIBE_FULL = 21
REQUEST_DISCONNECT = 12

MAX_INSTRUMENTS_PER_MESSAGE = 100


@dataclass(frozen=True)
class FeedInstrument:
    exchange_segment: str
    security_id: str


class DhanFeedClient:
    """Client for DhanHQ live market feed (multi-instrument, batched subscribe)."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        oauth: Optional[DhanHQOAuth] = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.oauth = oauth or DhanHQOAuth(self.settings)
        self._ws: Optional[WebSocketClientProtocol] = None
        self._running = False

    def _feed_url(self) -> str:
        if not self.settings.dhanhq_credentials_configured:
            raise DhanHQAuthError(
                "Missing DHANHQ_ACCESS_TOKEN / DHANHQ_CLIENT_ID in backend/.env"
            )

        params = urlencode(
            {
                "version": "2",
                "token": self.settings.dhanhq_access_token,
                "clientId": self.settings.dhanhq_client_id,
                "authType": "2",
            }
        )
        return f"wss://api-feed.dhan.co?{params}"

    async def connect(self) -> None:
        url = self._feed_url()
        self._ws = await websockets.connect(url, ping_interval=20, ping_timeout=40)
        logger.info("Connected to Dhan live feed")

    async def subscribe(
        self,
        instruments: list[FeedInstrument],
        *,
        request_code: int = REQUEST_SUBSCRIBE_QUOTE,
    ) -> None:
        if not self._ws:
            raise RuntimeError("WebSocket not connected")
        if not instruments:
            return

        for i in range(0, len(instruments), MAX_INSTRUMENTS_PER_MESSAGE):
            chunk = instruments[i : i + MAX_INSTRUMENTS_PER_MESSAGE]
            payload = {
                "RequestCode": request_code,
                "InstrumentCount": len(chunk),
                "InstrumentList": [
                    {
                        "ExchangeSegment": inst.exchange_segment,
                        "SecurityId": str(inst.security_id),
                    }
                    for inst in chunk
                ],
            }
            await self._ws.send(json.dumps(payload))

        logger.info(
            "Subscribed %s instruments (request_code=%s)",
            len(instruments),
            request_code,
        )

    async def subscribe_ticker(self, instrument: NiftyInstrument) -> None:
        await self.subscribe(
            [
                FeedInstrument(
                    exchange_segment=instrument.exchange_segment,
                    security_id=str(instrument.security_id),
                )
            ],
            request_code=REQUEST_SUBSCRIBE_TICKER,
        )

    async def listen(self, on_event: OnFeedEventCallback) -> None:
        if not self._ws:
            raise RuntimeError("WebSocket not connected")

        self._running = True
        while self._running and self._ws:
            try:
                message = await self._ws.recv()
                if isinstance(message, str):
                    continue
                event = parse_feed_event(message)
                if event:
                    await on_event(event)
            except websockets.ConnectionClosed:
                logger.warning("Dhan feed connection closed")
                break
            except Exception as exc:
                logger.exception("Feed listen error: %s", exc)
                await asyncio.sleep(1)

    async def disconnect(self) -> None:
        self._running = False
        if self._ws:
            try:
                await self._ws.send(json.dumps({"RequestCode": REQUEST_DISCONNECT}))
                await self._ws.close()
            except Exception:
                pass
            self._ws = None

    async def run_with_reconnect(
        self,
        on_event: OnFeedEventCallback,
        *,
        instruments: list[FeedInstrument],
        request_code: int = REQUEST_SUBSCRIBE_QUOTE,
    ) -> None:
        delay = 2.0
        self._running = True
        while self._running:
            try:
                await self.connect()
                await self.subscribe(instruments, request_code=request_code)
                await self.listen(on_event)
            except DhanHQAuthError:
                raise
            except Exception as exc:
                logger.warning("Feed reconnect: %s", exc)
            finally:
                await self.disconnect()

            if not self._running:
                break
            await asyncio.sleep(delay)
            delay = min(delay * 2, 60)

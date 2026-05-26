from __future__ import annotations

import asyncio
import json
import logging
from typing import Awaitable, Callable, Optional
from urllib.parse import urlencode

import websockets
from websockets.client import WebSocketClientProtocol

from app.auth.dhanhq_oauth import DhanHQAuthError, DhanHQOAuth
from app.config import Settings, get_settings
from app.feed.binary_parser import MarketTick, parse_tick
from app.market.nifty import NiftyInstrument

logger = logging.getLogger(__name__)

OnTickCallback = Callable[[MarketTick], Awaitable[None]]

# Per docs: JSON request; binary responses.
REQUEST_SUBSCRIBE_TICKER = 15
REQUEST_DISCONNECT = 12


class DhanFeedClient:
    """Single-connection client to DhanHQ live market feed."""

    def __init__(
        self,
        instrument: NiftyInstrument,
        settings: Optional[Settings] = None,
        oauth: Optional[DhanHQOAuth] = None,
    ) -> None:
        self.instrument = instrument
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

    async def subscribe_ticker(self) -> None:
        if not self._ws:
            raise RuntimeError("WebSocket not connected")

        payload = {
            "RequestCode": REQUEST_SUBSCRIBE_TICKER,
            "InstrumentCount": 1,
            "InstrumentList": [
                {
                    "ExchangeSegment": self.instrument.exchange_segment,
                    "SecurityId": str(self.instrument.security_id),
                }
            ],
        }
        await self._ws.send(json.dumps(payload))
        logger.info(
            "Subscribed ticker feed: %s / %s",
            self.instrument.exchange_segment,
            self.instrument.security_id,
        )

    async def listen(self, on_tick: OnTickCallback) -> None:
        if not self._ws:
            raise RuntimeError("WebSocket not connected")

        self._running = True
        while self._running and self._ws:
            try:
                message = await self._ws.recv()
                if isinstance(message, str):
                    continue
                tick = parse_tick(message)
                if tick:
                    await on_tick(tick)
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

    async def run_with_reconnect(self, on_tick: OnTickCallback) -> None:
        delay = 2.0
        self._running = True
        while self._running:
            try:
                await self.connect()
                await self.subscribe_ticker()
                await self.listen(on_tick)
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


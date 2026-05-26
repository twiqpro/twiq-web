"""
Parse DhanHQ live feed binary packets (little-endian).

Docs: https://dhanhq.co/docs/v2/live-market-feed/
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from typing import Literal, Optional, Union


@dataclass(frozen=True)
class FeedHeader:
    feed_code: int
    message_length: int
    exchange_segment: int
    security_id: int


@dataclass(frozen=True)
class MarketTick:
    security_id: int
    price: float
    volume: int
    timestamp: int
    open_interest: Optional[int] = None


@dataclass(frozen=True)
class OpenInterestUpdate:
    security_id: int
    open_interest: int


FeedEvent = Union[MarketTick, OpenInterestUpdate]


def parse_header(data: bytes) -> Optional[FeedHeader]:
    if len(data) < 8:
        return None
    feed_code, msg_len, exchange, security_id = struct.unpack_from("<BHB I", data, 0)
    return FeedHeader(
        feed_code=int(feed_code),
        message_length=int(msg_len),
        exchange_segment=int(exchange),
        security_id=int(security_id),
    )


def parse_tick(data: bytes) -> Optional[MarketTick]:
    """Parse LTP quote/ticker packets (legacy helper)."""
    event = parse_feed_event(data)
    if isinstance(event, MarketTick):
        return event
    return None


def parse_feed_event(data: bytes) -> Optional[FeedEvent]:
    header = parse_header(data)
    if not header:
        return None

    payload = data[8:]

    # Ticker: [ltp float32][ltt int32]
    if header.feed_code == 2 and len(payload) >= 8:
        ltp, ltt = struct.unpack_from("<fI", payload, 0)
        return MarketTick(
            security_id=header.security_id,
            price=float(ltp),
            volume=0,
            timestamp=int(ltt),
        )

    # Quote: LTP + volume (OI sent as separate packet code 5)
    if header.feed_code == 4 and len(payload) >= 22:
        ltp = struct.unpack_from("<f", payload, 0)[0]
        ltt = struct.unpack_from("<I", payload, 6)[0]
        vol = struct.unpack_from("<I", payload, 14)[0]
        return MarketTick(
            security_id=header.security_id,
            price=float(ltp),
            volume=int(vol),
            timestamp=int(ltt),
        )

    # OI-only packet (when subscribed to Quote mode on FNO)
    if header.feed_code == 5 and len(payload) >= 4:
        oi = struct.unpack_from("<i", payload, 0)[0]
        return OpenInterestUpdate(
            security_id=header.security_id,
            open_interest=int(oi),
        )

    # Full packet includes OI at bytes 35-38 (relative to payload start 0)
    if header.feed_code == 8 and len(payload) >= 38:
        ltp = struct.unpack_from("<f", payload, 0)[0]
        ltt = struct.unpack_from("<I", payload, 6)[0]
        vol = struct.unpack_from("<I", payload, 14)[0]
        oi = struct.unpack_from("<i", payload, 27)[0]
        return MarketTick(
            security_id=header.security_id,
            price=float(ltp),
            volume=int(vol),
            timestamp=int(ltt),
            open_interest=int(oi),
        )

    return None

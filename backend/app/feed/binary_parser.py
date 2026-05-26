"""
Parse DhanHQ live feed binary packets (little-endian).

Docs: https://dhanhq.co/docs/v2/live-market-feed/
"""

from __future__ import annotations

import struct
from dataclasses import dataclass
from typing import Optional


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


def parse_header(data: bytes) -> Optional[FeedHeader]:
    if len(data) < 8:
        return None
    # 1 byte feed_code, 2 bytes length, 1 byte exchange, 4 bytes security_id
    feed_code, msg_len, exchange, security_id = struct.unpack_from("<BHB I", data, 0)
    return FeedHeader(
        feed_code=int(feed_code),
        message_length=int(msg_len),
        exchange_segment=int(exchange),
        security_id=int(security_id),
    )


def parse_tick(data: bytes) -> Optional[MarketTick]:
    """
    Minimal parsing for chart updates.

    - Ticker packet (code 2): LTP(float32) + LTT(int32 epoch)
    - Quote packet (code 4): includes LTP + Volume + LTT
    - PrevClose (6) / OI (5) etc are ignored for now.
    """
    header = parse_header(data)
    if not header:
        return None

    # payload starts after 8-byte header
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

    # Quote: [ltp float32][ltq int16][ltt int32][atp float32][vol int32]...
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

    return None


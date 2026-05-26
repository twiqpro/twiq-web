from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from app.config import Settings, get_settings


@dataclass(frozen=True)
class NiftyInstrument:
    security_id: str
    symbol: str
    display_name: str
    exchange_segment: str
    instrument: str


_cached: Optional[NiftyInstrument] = None


async def get_nifty_instrument(settings: Optional[Settings] = None) -> NiftyInstrument:
    global _cached
    if _cached is not None:
        return _cached

    settings = settings or get_settings()
    _cached = NiftyInstrument(
        security_id=str(settings.nifty_security_id),
        symbol="NIFTY",
        display_name="Nifty 50 Index",
        exchange_segment=str(settings.nifty_exchange_segment),
        instrument=str(settings.nifty_instrument),
    )
    return _cached


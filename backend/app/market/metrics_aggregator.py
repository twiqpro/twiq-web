from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from app.clients.dhanhq_client import DhanHQClient
from app.config import Settings, get_settings
from app.feed.binary_parser import MarketTick, OpenInterestUpdate
from app.feed.dhan_feed import FeedInstrument, REQUEST_SUBSCRIBE_QUOTE
from app.market.metrics_compute import (
    build_metrics_note,
    compute_atm_iv,
    compute_max_pain,
    compute_oi_support_resistance,
    compute_pcr,
    format_expiry_label,
    pcr_sentiment,
)
from app.market.option_chain import (
    OptionChainBootstrap,
    parse_option_chain_response,
    pick_nearest_expiry,
)
from app.models.metrics import NiftyMetricsSnapshot, OIStrikeRow

logger = logging.getLogger(__name__)


class NiftyMetricsAggregator:
    """In-memory NIFTY option metrics; bootstrapped via REST, updated via Dhan WS OI/LTP."""

    def __init__(self, settings: Optional[Settings] = None) -> None:
        self.settings = settings or get_settings()
        self._client = DhanHQClient(self.settings)
        self._lock = asyncio.Lock()

        self.expiry: str = ""
        self.spot: float = 0.0
        self.futures_ltp: Optional[float] = None
        self.vix_ltp: Optional[float] = None
        self.vix_prev_close: Optional[float] = None
        self._rows_by_strike: dict[float, OIStrikeRow] = {}
        self._leg_map: dict[int, tuple[float, str]] = {}
        self._bootstrap: Optional[OptionChainBootstrap] = None
        self._dirty = False
        self._last_snapshot: Optional[NiftyMetricsSnapshot] = None

    @property
    def feed_instruments(self) -> list[FeedInstrument]:
        instruments: list[FeedInstrument] = [
            FeedInstrument(
                exchange_segment=self.settings.nifty_exchange_segment,
                security_id=str(self.settings.nifty_security_id),
            ),
        ]
        if self.settings.nifty_futures_security_id:
            instruments.append(
                FeedInstrument(
                    exchange_segment=self.settings.nifty_futures_exchange_segment,
                    security_id=str(self.settings.nifty_futures_security_id),
                )
            )
        if self.settings.india_vix_security_id:
            instruments.append(
                FeedInstrument(
                    exchange_segment=self.settings.india_vix_exchange_segment,
                    security_id=str(self.settings.india_vix_security_id),
                )
            )
        for leg in self._bootstrap.legs if self._bootstrap else []:
            instruments.append(
                FeedInstrument(
                    exchange_segment=leg.exchange_segment,
                    security_id=str(leg.security_id),
                )
            )
        return instruments

    async def bootstrap(self, expiry: Optional[str] = None) -> None:
        underlying = self.settings.nifty_security_id
        segment = self.settings.nifty_exchange_segment

        expiries = await self._client.get_option_expiries(underlying, segment)
        chosen = expiry or pick_nearest_expiry(expiries)
        raw = await self._client.get_option_chain(underlying, segment, chosen)
        boot = parse_option_chain_response(raw, expiry=chosen)

        async with self._lock:
            self._bootstrap = boot
            self.expiry = boot.expiry
            self.spot = boot.spot
            self._rows_by_strike = {row.strike: row.model_copy(deep=True) for row in boot.rows}
            self._leg_map = {
                leg.security_id: (leg.strike, leg.side) for leg in boot.legs
            }
            self._dirty = True
            self._last_snapshot = self._build_snapshot_unlocked()

        logger.info(
            "Metrics bootstrap: expiry=%s strikes=%s legs=%s",
            chosen,
            len(boot.rows),
            len(boot.legs),
        )

    async def apply_feed_event(self, event: MarketTick | OpenInterestUpdate) -> bool:
        changed = False
        async with self._lock:
            if isinstance(event, OpenInterestUpdate):
                changed = self._apply_oi_unlocked(event)
            elif isinstance(event, MarketTick):
                changed = self._apply_tick_unlocked(event)

            if changed:
                self._dirty = True
                self._last_snapshot = self._build_snapshot_unlocked()
        return changed

    def get_snapshot(self) -> Optional[NiftyMetricsSnapshot]:
        return self._last_snapshot

    def _apply_oi_unlocked(self, event: OpenInterestUpdate) -> bool:
        mapping = self._leg_map.get(event.security_id)
        if not mapping:
            return False
        strike, side = mapping
        row = self._rows_by_strike.get(strike)
        if not row:
            return False
        if side == "ce" and row.call_oi == event.open_interest:
            return False
        if side == "pe" and row.put_oi == event.open_interest:
            return False
        if side == "ce":
            row.call_oi = event.open_interest
        else:
            row.put_oi = event.open_interest
        row.total_oi = row.call_oi + row.put_oi
        return True

    def _apply_tick_unlocked(self, event: MarketTick) -> bool:
        sid = str(event.security_id)
        if sid == str(self.settings.nifty_security_id):
            if self.spot != event.price:
                self.spot = event.price
                return True
            return False

        if (
            self.settings.nifty_futures_security_id
            and sid == str(self.settings.nifty_futures_security_id)
        ):
            if self.futures_ltp != event.price:
                self.futures_ltp = event.price
                return True
            return False

        if (
            self.settings.india_vix_security_id
            and sid == str(self.settings.india_vix_security_id)
        ):
            if self.vix_ltp != event.price:
                self.vix_ltp = event.price
                return True
            return False

        mapping = self._leg_map.get(event.security_id)
        if not mapping:
            return False

        strike, side = mapping
        row = self._rows_by_strike.get(strike)
        if not row:
            return False

        changed = False
        if event.open_interest is not None:
            if side == "ce" and row.call_oi != event.open_interest:
                row.call_oi = event.open_interest
                changed = True
            elif side == "pe" and row.put_oi != event.open_interest:
                row.put_oi = event.open_interest
                changed = True
            if changed:
                row.total_oi = row.call_oi + row.put_oi

        if side == "ce" and row.call_ltp != event.price:
            row.call_ltp = event.price
            changed = True
        elif side == "pe" and row.put_ltp != event.price:
            row.put_ltp = event.price
            changed = True

        return changed

    def _build_snapshot_unlocked(self) -> NiftyMetricsSnapshot:
        rows = sorted(self._rows_by_strike.values(), key=lambda r: r.strike)
        spot = self.spot or (rows[0].strike if rows else 0.0)
        pcr = compute_pcr(rows)
        sentiment = pcr_sentiment(pcr)
        support, resistance = compute_oi_support_resistance(rows, spot)
        max_pain = compute_max_pain(rows)
        atm_iv = compute_atm_iv(rows, spot)

        vix_change = None
        if self.vix_ltp is not None and self.vix_prev_close:
            vix_change = round(self.vix_ltp - self.vix_prev_close, 1)

        return NiftyMetricsSnapshot(
            expiry=self.expiry,
            expiry_label=format_expiry_label(self.expiry) if self.expiry else "",
            spot=round(spot, 2),
            futures=round(self.futures_ltp, 2) if self.futures_ltp else None,
            india_vix=round(self.vix_ltp, 1) if self.vix_ltp else None,
            india_vix_change=vix_change,
            pcr=pcr,
            pcr_label=sentiment,
            oi_support=support,
            oi_resistance=resistance,
            atm_iv=atm_iv,
            max_pain=max_pain,
            strikes=rows,
            note=build_metrics_note(
                atm_iv=atm_iv,
                india_vix=self.vix_ltp,
                pcr_label=sentiment,
                oi_support=support,
                oi_resistance=resistance,
            ),
        )

    def snapshot_dict(self) -> dict[str, Any]:
        snap = self.get_snapshot()
        if not snap:
            return {}
        return snap.model_dump()

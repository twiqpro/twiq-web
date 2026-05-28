from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from app.clients.dhanhq_client import DhanHQClient
from app.config import Settings, get_settings
from app.feed.binary_parser import (
    MarketTick,
    OpenInterestUpdate,
    PreviousCloseUpdate,
)
from app.feed.dhan_feed import FeedInstrument, REQUEST_SUBSCRIBE_QUOTE
from app.market.metrics_compute import (
    apply_oi_changes_to_rows,
    build_metrics_note,
    compute_estimated_gamma,
    compute_atm_iv,
    compute_max_pain,
    compute_oi_interval_changes,
    compute_oi_support_resistance,
    compute_pcr,
    format_expiry_label,
    pcr_sentiment,
)
from app.market.oi_history import OiHistoryStore, StrikeOiSnapshot
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
        self._futures_security_id: Optional[str] = (
            str(self.settings.nifty_futures_security_id).strip() or None
        )
        self._futures_exchange_segment: str = self.settings.nifty_futures_exchange_segment
        self.vix_ltp: Optional[float] = None
        self.vix_prev_close: Optional[float] = None
        self._rows_by_strike: dict[float, OIStrikeRow] = {}
        self._leg_map: dict[int, tuple[float, str]] = {}
        self._bootstrap: Optional[OptionChainBootstrap] = None
        self._dirty = False
        self._last_snapshot: Optional[NiftyMetricsSnapshot] = None
        self._oi_history = OiHistoryStore()
        self._oi_interval: str = "15M"
        self._prev_gamma_regime: Optional[str] = None
        self._gamma_regime_changed_intraday: bool = False

    @property
    def feed_instruments(self) -> list[FeedInstrument]:
        instruments: list[FeedInstrument] = [
            FeedInstrument(
                exchange_segment=self.settings.nifty_exchange_segment,
                security_id=str(self.settings.nifty_security_id),
            ),
        ]
        if self._futures_security_id:
            instruments.append(
                FeedInstrument(
                    exchange_segment=self._futures_exchange_segment,
                    security_id=str(self._futures_security_id),
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
        await self._resolve_futures_instrument()
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
            self._prev_gamma_regime = None
            self._gamma_regime_changed_intraday = False

        await self._bootstrap_index_quotes()
        async with self._lock:
            self._record_oi_history_unlocked()
            self._last_snapshot = self._build_snapshot_unlocked(self._oi_interval)

        logger.info(
            "Metrics bootstrap: expiry=%s strikes=%s legs=%s vix=%s",
            chosen,
            len(boot.rows),
            len(boot.legs),
            self.vix_ltp,
        )

    async def _bootstrap_index_quotes(self) -> None:
        """Seed index LTP / prev close via REST so UI is populated before WS ticks."""
        body: dict[str, list[int]] = {}

        if self._futures_security_id:
            body.setdefault(self._futures_exchange_segment, []).append(
                int(self._futures_security_id)
            )

        vix_seg = self.settings.india_vix_exchange_segment
        vix_id = self.settings.india_vix_security_id
        if vix_id:
            body.setdefault(vix_seg, []).append(int(vix_id))

        if not body:
            return

        try:
            data = await self._client.get_market_ohlc(body)
        except Exception as exc:
            logger.warning("Index OHLC bootstrap failed: %s", exc)
            return

        futures_ltp = None
        if self._futures_security_id:
            futures_ltp, _ = self._client.extract_segment_quote(
                data, self._futures_exchange_segment, self._futures_security_id
            )
            if futures_ltp is None:
                try:
                    fut_candles = await self._client.get_historical_data(
                        security_id=str(self._futures_security_id),
                        exchange_segment=self._futures_exchange_segment,
                        instrument="FUTIDX",
                        interval="1M",
                        limit=1,
                        include_oi=False,
                    )
                    if fut_candles:
                        futures_ltp = fut_candles[-1].close
                except Exception as exc:
                    logger.warning("Futures historical bootstrap failed: %s", exc)

        ltp, prev = (
            self._client.extract_segment_quote(data, vix_seg, vix_id)
            if vix_id
            else (None, None)
        )
        async with self._lock:
            if futures_ltp is not None:
                self.futures_ltp = futures_ltp
            if ltp is not None:
                self.vix_ltp = ltp
            if prev is not None:
                self.vix_prev_close = prev

    async def _resolve_futures_instrument(self) -> None:
        if self._futures_security_id:
            return

        preferences = [
            s.strip()
            for s in self.settings.nifty_futures_symbol_preference.split(",")
            if s.strip()
        ]
        try:
            resolved = await self._client.resolve_next_index_future(preferences)
        except Exception as exc:
            logger.warning("Futures instrument auto-discovery failed: %s", exc)
            return
        if not resolved:
            logger.warning("No matching futures instrument found for %s", preferences)
            return

        self._futures_security_id = resolved["security_id"]
        self._futures_exchange_segment = resolved["exchange_segment"]
        logger.info(
            "Resolved futures instrument: %s (%s)",
            resolved["symbol"],
            self._futures_security_id,
        )

    async def apply_feed_event(
        self,
        event: MarketTick | OpenInterestUpdate | PreviousCloseUpdate,
    ) -> bool:
        changed = False
        async with self._lock:
            if isinstance(event, OpenInterestUpdate):
                changed = self._apply_oi_unlocked(event)
            elif isinstance(event, PreviousCloseUpdate):
                changed = self._apply_prev_close_unlocked(event)
            elif isinstance(event, MarketTick):
                changed = self._apply_tick_unlocked(event)

            if changed:
                self._dirty = True
                self._last_snapshot = self._build_snapshot_unlocked(self._oi_interval)
        return changed

    def set_oi_interval(self, interval: str) -> None:
        self._oi_interval = interval.upper()

    async def record_oi_history_snapshot_async(self) -> None:
        async with self._lock:
            self._record_oi_history_unlocked()

    def _record_oi_history_unlocked(self) -> None:
        if not self._rows_by_strike:
            return
        payload = {
            strike: StrikeOiSnapshot(call_oi=row.call_oi, put_oi=row.put_oi)
            for strike, row in self._rows_by_strike.items()
        }
        self._oi_history.record(payload)

    def get_snapshot(
        self,
        oi_interval: Optional[str] = None,
    ) -> Optional[NiftyMetricsSnapshot]:
        if oi_interval:
            self._oi_interval = oi_interval.upper()
        return self._last_snapshot

    def rebuild_snapshot(self, oi_interval: Optional[str] = None) -> None:
        if oi_interval:
            self._oi_interval = oi_interval.upper()
        snap = self._build_snapshot_unlocked(self._oi_interval)
        self._last_snapshot = snap

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

    def _apply_prev_close_unlocked(self, event: PreviousCloseUpdate) -> bool:
        sid = str(event.security_id)
        if (
            self.settings.india_vix_security_id
            and sid == str(self.settings.india_vix_security_id)
            and self.vix_prev_close != event.previous_close
        ):
            self.vix_prev_close = event.previous_close
            return True
        return False

    def _apply_tick_unlocked(self, event: MarketTick) -> bool:
        sid = str(event.security_id)
        if sid == str(self.settings.nifty_security_id):
            if self.spot != event.price:
                self.spot = event.price
                return True
            return False

        if self._futures_security_id and sid == str(self._futures_security_id):
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

    def _build_snapshot_unlocked(self, oi_interval: str = "15M") -> NiftyMetricsSnapshot:
        rows = sorted(self._rows_by_strike.values(), key=lambda r: r.strike)
        changes_map, history_ready = compute_oi_interval_changes(
            self._oi_history,
            rows,
        )
        rows = apply_oi_changes_to_rows(rows, changes_map)
        spot = self.spot or (rows[0].strike if rows else 0.0)
        pcr = compute_pcr(rows)
        sentiment = pcr_sentiment(pcr)
        support, resistance = compute_oi_support_resistance(rows, spot)
        max_pain = compute_max_pain(rows)
        atm_iv = compute_atm_iv(rows, spot)

        vix_change = None
        if self.vix_ltp is not None and self.vix_prev_close:
            vix_change = round(self.vix_ltp - self.vix_prev_close, 1)

        gamma_estimate = compute_estimated_gamma(
            rows=rows,
            spot=spot,
            expiry_iso=self.expiry,
            risk_free_rate=self.settings.gamma_risk_free_rate,
            contract_multiplier=self.settings.gamma_contract_multiplier,
            regime_changed_intraday=self._gamma_regime_changed_intraday,
        )
        current_gamma_regime = gamma_estimate.regime
        if current_gamma_regime in {"Positive", "Negative", "Neutral"}:
            if (
                self._prev_gamma_regime
                and self._prev_gamma_regime != current_gamma_regime
            ):
                self._gamma_regime_changed_intraday = True
                gamma_estimate.regime_changed_intraday = True
            self._prev_gamma_regime = current_gamma_regime

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
            oi_interval=oi_interval.upper(),
            oi_history_ready=history_ready,
            gamma_estimate=gamma_estimate,
            note=build_metrics_note(
                atm_iv=atm_iv,
                india_vix=self.vix_ltp,
                pcr_label=sentiment,
                oi_support=support,
                oi_resistance=resistance,
            ),
        )

    def snapshot_dict(self, oi_interval: Optional[str] = None) -> dict[str, Any]:
        if oi_interval:
            self.rebuild_snapshot(oi_interval)
        snap = self._last_snapshot
        if not snap:
            return {}
        return snap.model_dump()

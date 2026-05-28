from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Iterable, Optional
from zoneinfo import ZoneInfo

from app.models.market import CandleData, TrendSignal

IST = ZoneInfo("Asia/Kolkata")


def classify_trend_from_candles(candles: Iterable[CandleData]) -> TrendSignal:
    all_candles = list(candles)
    if not all_candles:
        return TrendSignal(regime="Sideways")

    now_day = datetime.now(tz=IST).date()
    intraday = [
        c for c in all_candles if datetime.fromtimestamp(c.timestamp, tz=IST).date() == now_day
    ]
    if not intraday:
        intraday = all_candles[-25:]

    day_open = intraday[0].open
    current = intraday[-1].close
    day_high = max(c.high for c in intraday)
    day_low = min(c.low for c in intraday)

    change_pct = ((current - day_open) / day_open) * 100 if day_open else 0.0
    range_pct = ((day_high - day_low) / day_open) * 100 if day_open else 0.0

    if abs(change_pct) < 0.25 and range_pct < 1.2:
        regime = "Sideways"
    elif change_pct >= 0.3:
        regime = "Bullish"
    elif change_pct <= -0.3:
        regime = "Bearish"
    else:
        regime = "Sideways"

    return TrendSignal(
        regime=regime,
        day_open=round(day_open, 2),
        current=round(current, 2),
        change_pct=round(change_pct, 3),
    )


@dataclass
class IntradayTrendTracker:
    day_key: Optional[str] = None
    day_open: Optional[float] = None
    day_high: Optional[float] = None
    day_low: Optional[float] = None
    current: Optional[float] = None

    def update(self, price: float, ts: int) -> TrendSignal:
        day = datetime.fromtimestamp(ts, tz=IST).date().isoformat()
        if self.day_key != day:
            self.day_key = day
            self.day_open = price
            self.day_high = price
            self.day_low = price
            self.current = price
        else:
            self.current = price
            self.day_high = max(self.day_high or price, price)
            self.day_low = min(self.day_low or price, price)

        day_open = self.day_open or price
        current = self.current or price
        day_high = self.day_high or price
        day_low = self.day_low or price
        change_pct = ((current - day_open) / day_open) * 100 if day_open else 0.0
        range_pct = ((day_high - day_low) / day_open) * 100 if day_open else 0.0

        if abs(change_pct) < 0.25 and range_pct < 1.2:
            regime = "Sideways"
        elif change_pct >= 0.3:
            regime = "Bullish"
        elif change_pct <= -0.3:
            regime = "Bearish"
        else:
            regime = "Sideways"

        return TrendSignal(
            regime=regime,
            day_open=round(day_open, 2),
            current=round(current, 2),
            change_pct=round(change_pct, 3),
        )


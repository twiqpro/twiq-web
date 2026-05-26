from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from zoneinfo import ZoneInfo

IST = ZoneInfo("Asia/Kolkata")


@dataclass
class Candle:
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: int = 0

    def to_dict(self) -> dict:
        return {
            "time": self.time,
            "open": self.open,
            "high": self.high,
            "low": self.low,
            "close": self.close,
            "volume": self.volume,
        }


class CandleAggregator:
    """Aggregate ticks into OHLC candles for a given timeframe."""

    def __init__(self, timeframe: str) -> None:
        self.timeframe = timeframe.upper()
        self.current: Optional[Candle] = None

    @staticmethod
    def candle_start_ts(timestamp: int, timeframe: str) -> int:
        dt = datetime.fromtimestamp(timestamp, tz=IST)
        tf = timeframe.upper()

        if tf == "1M":
            dt = dt.replace(second=0, microsecond=0)
        elif tf == "5M":
            dt = dt.replace(minute=(dt.minute // 5) * 5, second=0, microsecond=0)
        elif tf == "15M":
            dt = dt.replace(minute=(dt.minute // 15) * 15, second=0, microsecond=0)
        elif tf in ("1H", "60M"):
            dt = dt.replace(minute=0, second=0, microsecond=0)
        elif tf == "1D":
            dt = dt.replace(hour=0, minute=0, second=0, microsecond=0)
        else:
            raise ValueError(f"Unsupported timeframe: {timeframe}")

        return int(dt.timestamp())

    def add_tick(self, price: float, volume: int, timestamp: int) -> Optional[Candle]:
        if timestamp <= 0:
            timestamp = int(datetime.now(IST).timestamp())

        bucket = self.candle_start_ts(timestamp, self.timeframe)

        if self.current is None:
            self.current = Candle(
                time=bucket,
                open=price,
                high=price,
                low=price,
                close=price,
                volume=volume,
            )
            return None

        if bucket != self.current.time:
            closed = self.current
            self.current = Candle(
                time=bucket,
                open=price,
                high=price,
                low=price,
                close=price,
                volume=volume,
            )
            return closed

        self.current.high = max(self.current.high, price)
        self.current.low = min(self.current.low, price)
        self.current.close = price
        self.current.volume += volume
        return None

    def partial(self) -> Optional[Candle]:
        if not self.current:
            return None
        return Candle(
            time=self.current.time,
            open=self.current.open,
            high=self.current.high,
            low=self.current.low,
            close=self.current.close,
            volume=self.current.volume,
        )


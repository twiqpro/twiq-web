from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CandleData(BaseModel):
    timestamp: int
    open: float
    high: float
    low: float
    close: float
    volume: int = 0
    open_interest: Optional[int] = None


class TrendSignal(BaseModel):
    regime: str = "Sideways"
    day_open: Optional[float] = None
    current: Optional[float] = None
    change_pct: Optional[float] = None


class HistoricalDataResponse(BaseModel):
    symbol: str
    security_id: str
    exchange_segment: str
    interval: str
    candles: list[CandleData]
    count: int = Field(description="Number of candles returned")
    trend: TrendSignal = Field(default_factory=TrendSignal)


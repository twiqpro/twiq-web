from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class OIStrikeRow(BaseModel):
    strike: float
    call_oi: int = 0
    put_oi: int = 0
    total_oi: int = 0
    call_ltp: Optional[float] = None
    put_ltp: Optional[float] = None
    ce_iv: Optional[float] = None
    pe_iv: Optional[float] = None


class NiftyMetricsSnapshot(BaseModel):
    symbol: str = "NIFTY"
    expiry: str
    expiry_label: str
    spot: float
    futures: Optional[float] = None
    india_vix: Optional[float] = None
    india_vix_change: Optional[float] = None
    pcr: float
    pcr_label: str
    oi_support: Optional[float] = None
    oi_resistance: Optional[float] = None
    atm_iv: Optional[float] = None
    max_pain: Optional[float] = None
    strikes: list[OIStrikeRow] = Field(default_factory=list)
    note: str = ""

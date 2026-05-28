from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class StrikeOiChange(BaseModel):
    call_oi_change: Optional[int] = None
    put_oi_change: Optional[int] = None


class OIStrikeRow(BaseModel):
    strike: float
    call_oi: int = 0
    put_oi: int = 0
    total_oi: int = 0
    call_ltp: Optional[float] = None
    put_ltp: Optional[float] = None
    ce_iv: Optional[float] = None
    pe_iv: Optional[float] = None
    oi_changes: dict[str, StrikeOiChange] = Field(default_factory=dict)


class GammaStrikeContribution(BaseModel):
    strike: float
    estimated_gex: float
    call_oi: int
    put_oi: int
    iv: Optional[float] = None
    distance_from_spot: float
    contribution_label: str


class GammaEstimate(BaseModel):
    label: str = "Estimated Gamma Regime"
    regime: str = "Unavailable"
    direction: str = "Weakening"
    flip_zone: Optional[float] = None
    flip_distance_points: Optional[float] = None
    flip_distance_percent: Optional[float] = None
    confidence: str = "Low"
    status: str = "unavailable"
    spot: Optional[float] = None
    near_net_gamma: Optional[float] = None
    near_net_gamma_index: Optional[float] = None
    dominant_positive_strikes: list[float] = Field(default_factory=list)
    dominant_negative_strikes: list[float] = Field(default_factory=list)
    nearest_high_impact_strike: Optional[float] = None
    gamma_concentration_above_spot: Optional[float] = None
    gamma_concentration_below_spot: Optional[float] = None
    gamma_concentration_above_share: Optional[float] = None
    gamma_concentration_below_share: Optional[float] = None
    spot_position_vs_zone: str = "Unknown"
    regime_changed_intraday: bool = False
    strike_contributions: list[GammaStrikeContribution] = Field(default_factory=list)
    insights: list[str] = Field(default_factory=list)


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
    oi_interval: str = "15M"
    oi_history_ready: bool = False
    gamma_estimate: GammaEstimate = Field(default_factory=GammaEstimate)
    note: str = ""

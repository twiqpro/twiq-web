from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any, Literal, Optional
from zoneinfo import ZoneInfo

from app.models.metrics import OIStrikeRow

IST = ZoneInfo("Asia/Kolkata")
OptionSide = Literal["ce", "pe"]


@dataclass(frozen=True)
class OptionLeg:
    security_id: int
    strike: float
    side: OptionSide
    exchange_segment: str = "NSE_FNO"


@dataclass
class OptionChainBootstrap:
    expiry: str
    spot: float
    rows: list[OIStrikeRow]
    legs: list[OptionLeg] = field(default_factory=list)
    leg_by_security_id: dict[int, OptionLeg] = field(default_factory=dict)


def pick_nearest_expiry(expiries: list[str]) -> str:
    today = datetime.now(IST).date()
    parsed: list[tuple[date, str]] = []
    for raw in expiries:
        try:
            parsed.append((datetime.strptime(raw, "%Y-%m-%d").date(), raw))
        except ValueError:
            continue
    if not parsed:
        raise ValueError("No valid option expiries returned")
    future = [p for p in parsed if p[0] >= today]
    pool = future if future else parsed
    pool.sort(key=lambda x: x[0])
    return pool[0][1]


def parse_option_chain_response(
    data: dict[str, Any],
    *,
    expiry: str,
) -> OptionChainBootstrap:
    payload = data.get("data") or data
    spot = float(payload.get("last_price") or 0)
    oc = payload.get("oc") or {}

    rows: list[OIStrikeRow] = []
    legs: list[OptionLeg] = []
    leg_by_security_id: dict[int, OptionLeg] = {}

    for strike_key, sides in oc.items():
        strike = float(strike_key)
        ce = sides.get("ce") or {}
        pe = sides.get("pe") or {}
        call_oi = int(ce.get("oi") or 0)
        put_oi = int(pe.get("oi") or 0)
        rows.append(
            OIStrikeRow(
                strike=strike,
                call_oi=call_oi,
                put_oi=put_oi,
                total_oi=call_oi + put_oi,
                call_ltp=_float_or_none(ce.get("last_price")),
                put_ltp=_float_or_none(pe.get("last_price")),
                ce_iv=_float_or_none(ce.get("implied_volatility")),
                pe_iv=_float_or_none(pe.get("implied_volatility")),
            )
        )
        ce_id = ce.get("security_id")
        pe_id = pe.get("security_id")
        if ce_id is not None:
            leg = OptionLeg(
                security_id=int(ce_id),
                strike=strike,
                side="ce",
            )
            legs.append(leg)
            leg_by_security_id[leg.security_id] = leg
        if pe_id is not None:
            leg = OptionLeg(
                security_id=int(pe_id),
                strike=strike,
                side="pe",
            )
            legs.append(leg)
            leg_by_security_id[leg.security_id] = leg

    rows.sort(key=lambda r: r.strike)
    return OptionChainBootstrap(
        expiry=expiry,
        spot=spot,
        rows=rows,
        legs=legs,
        leg_by_security_id=leg_by_security_id,
    )


def _float_or_none(value: Any) -> Optional[float]:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None

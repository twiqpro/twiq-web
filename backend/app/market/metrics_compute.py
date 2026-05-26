from __future__ import annotations

from datetime import datetime
from typing import Iterable, Optional

from app.models.metrics import OIStrikeRow


def format_expiry_label(expiry_iso: str) -> str:
    """YYYY-MM-DD -> '26th June'."""
    dt = datetime.strptime(expiry_iso, "%Y-%m-%d")
    day = dt.day
    suffix = "th"
    if day % 10 == 1 and day != 11:
        suffix = "st"
    elif day % 10 == 2 and day != 12:
        suffix = "nd"
    elif day % 10 == 3 and day != 13:
        suffix = "rd"
    return f"{day}{suffix} {dt.strftime('%B')}"


def pcr_sentiment(pcr: float) -> str:
    if pcr < 0.8:
        return "Bullish"
    if pcr > 1.2:
        return "Bearish"
    return "Neutral"


def compute_pcr(rows: Iterable[OIStrikeRow]) -> float:
    call_oi = sum(r.call_oi for r in rows)
    put_oi = sum(r.put_oi for r in rows)
    if call_oi <= 0:
        return 0.0
    return round(put_oi / call_oi, 2)


def compute_oi_support_resistance(
    rows: Iterable[OIStrikeRow],
    spot: float,
) -> tuple[Optional[float], Optional[float]]:
    strikes = list(rows)
    if not strikes or not spot:
        return None, None

    def pick(side: str, strict: bool) -> Optional[float]:
        best_oi = -1
        level: Optional[float] = None
        for row in strikes:
            oi = row.put_oi if side == "support" else row.call_oi
            if side == "support":
                in_band = row.strike < spot if strict else row.strike <= spot
            else:
                in_band = row.strike > spot if strict else row.strike >= spot
            if not in_band or oi <= best_oi:
                continue
            best_oi = oi
            level = row.strike
        return level

    support = pick("support", True)
    resistance = pick("resistance", True)
    if support is None:
        support = pick("support", False)
    if resistance is None:
        resistance = pick("resistance", False)
    return support, resistance


def compute_max_pain(rows: Iterable[OIStrikeRow]) -> Optional[float]:
    """Strike where total option writer payout at expiry is minimized."""
    strikes = list(rows)
    if not strikes:
        return None

    candidates = sorted({r.strike for r in strikes})
    min_pain: Optional[float] = None
    best_strike: Optional[float] = None

    for settlement in candidates:
        pain = 0.0
        for row in strikes:
            if settlement > row.strike:
                pain += row.call_oi * (settlement - row.strike)
            if settlement < row.strike:
                pain += row.put_oi * (row.strike - settlement)
        if min_pain is None or pain < min_pain:
            min_pain = pain
            best_strike = settlement
    return best_strike


def compute_atm_iv(rows: Iterable[OIStrikeRow], spot: float) -> Optional[float]:
    if not spot:
        return None
    best: Optional[tuple[float, float]] = None
    for row in rows:
        dist = abs(row.strike - spot)
        if row.ce_iv is not None and row.pe_iv is not None:
            iv = (row.ce_iv + row.pe_iv) / 2
        elif row.ce_iv is not None:
            iv = row.ce_iv
        elif row.pe_iv is not None:
            iv = row.pe_iv
        else:
            continue
        if best is None or dist < best[0]:
            best = (dist, iv)
    return round(best[1], 1) if best else None


def build_metrics_note(
    *,
    atm_iv: Optional[float],
    india_vix: Optional[float],
    pcr_label: str,
    oi_support: Optional[float],
    oi_resistance: Optional[float],
) -> str:
    parts: list[str] = []
    if atm_iv is not None:
        parts.append(
            f"ATM IV at {atm_iv:.1f} suggests option premiums are "
            f"{'moderately priced' if atm_iv < 20 else 'elevated'}."
        )
    if india_vix is not None:
        parts.append(
            f"India VIX at {india_vix:.1f} indicates "
            f"{'elevated' if india_vix > 15 else 'subdued'} volatility expectations."
        )
    if oi_support is not None and oi_resistance is not None:
        parts.append(
            f"Market sentiment is {pcr_label.lower()} with OI support near "
            f"{oi_support:.0f} and resistance near {oi_resistance:.0f}."
        )
    return "\n\n".join(parts) if parts else "Live NIFTY options metrics."

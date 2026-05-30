from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from math import exp, log, pi, sqrt
from typing import Iterable, Optional
from zoneinfo import ZoneInfo

from app.market.oi_history import OiHistoryStore, StrikeOiSnapshot
from app.market.oi_intervals import OI_INTERVAL_KEYS, OI_INTERVAL_MINUTES
from app.market.price_oi_divergence import PriceOiSnapshot
from app.models.metrics import (
    GammaEstimate,
    GammaStrikeContribution,
    OIStrikeRow,
    PriceOiDivergence,
    PriceOiSample,
    StrikeOiChange,
)

IST = ZoneInfo("Asia/Kolkata")

PCR_PUT_HEAVY = 1.2
PCR_BALANCED_LOW = 0.8
PCR_EXTREME_PUT = 1.5
PCR_EXTREME_CALL = 0.5


@dataclass(frozen=True)
class PcrSentiment:
    """OI-based PCR positioning with optional contrarian extreme signal."""

    label: str
    extreme: Optional[str] = None

    @property
    def display_label(self) -> str:
        if self.extreme:
            return f"{self.label} · {self.extreme}"
        return self.label


def classify_pcr(pcr: float) -> PcrSentiment:
    """
    OI-based PCR logic (put writing / call writing interpretation).

    PCR > 1.2  → more puts written → Bullish
    0.8–1.2    → Neutral / sideways
    PCR < 0.8  → more calls written → Bearish

    Extremes (contrarian):
    PCR > 1.5  → excessive put writing → Reversal Down
    PCR < 0.5  → excessive call writing → Reversal Up
    """
    if pcr > PCR_EXTREME_PUT:
        return PcrSentiment(label="Bullish", extreme="Reversal Down")
    if pcr > PCR_PUT_HEAVY:
        return PcrSentiment(label="Bullish")
    if pcr >= PCR_BALANCED_LOW:
        return PcrSentiment(label="Neutral")
    if pcr >= PCR_EXTREME_CALL:
        return PcrSentiment(label="Bearish")
    return PcrSentiment(label="Bearish", extreme="Reversal Up")


def pcr_interpretation(pcr: float, sentiment: PcrSentiment) -> str:
    if sentiment.label == "Unavailable":
        return "PCR is unavailable until option-chain open interest loads."

    if sentiment.extreme == "Reversal Down":
        return (
            "More puts written than calls (bullish OI), but excessive put "
            "writing may signal overconfidence and a possible reversal down."
        )
    if sentiment.extreme == "Reversal Up":
        return (
            "More calls written than puts (bearish OI), but excessive call "
            "writing may signal overconfidence and a possible reversal up."
        )
    if sentiment.label == "Bullish":
        return "More puts written than calls — bullish OI positioning."
    if sentiment.label == "Bearish":
        return "More calls written than puts — bearish OI positioning."
    return "Put and call open interest are broadly balanced — neutral sideways positioning."


def pcr_sentiment(pcr: float) -> str:
    """Backward-compatible display label for callers expecting a string."""
    return classify_pcr(pcr).display_label


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


def compute_oi_interval_changes(
    history: OiHistoryStore,
    rows: Iterable[OIStrikeRow],
    *,
    now_ts: int | None = None,
) -> tuple[dict[float, dict[str, StrikeOiChange]], bool]:
    """Per-interval OI delta vs snapshot at (now - interval)."""
    from time import time as _time

    now = int(now_ts if now_ts is not None else _time())
    oldest = history.oldest_ts
    history_ready = oldest is not None and (now - oldest) >= 60

    changes_by_strike: dict[float, dict[str, StrikeOiChange]] = {
        row.strike: {} for row in rows
    }

    for key in OI_INTERVAL_KEYS:
        minutes = OI_INTERVAL_MINUTES[key]
        lookback = now - minutes * 60
        past = history.lookup_at(lookback)
        if past is None:
            for row in rows:
                changes_by_strike[row.strike][key] = StrikeOiChange()
            continue

        for row in rows:
            prev = past.get(row.strike)
            if prev is None:
                changes_by_strike[row.strike][key] = StrikeOiChange()
                continue
            changes_by_strike[row.strike][key] = StrikeOiChange(
                call_oi_change=row.call_oi - prev.call_oi,
                put_oi_change=row.put_oi - prev.put_oi,
            )

    return changes_by_strike, history_ready


def apply_oi_changes_to_rows(
    rows: list[OIStrikeRow],
    changes_by_strike: dict[float, dict[str, StrikeOiChange]],
) -> list[OIStrikeRow]:
    out: list[OIStrikeRow] = []
    for row in rows:
        interval_map = changes_by_strike.get(row.strike, {})
        out.append(
            row.model_copy(
                update={
                    "oi_changes": {
                        k: interval_map.get(k, StrikeOiChange())
                        for k in OI_INTERVAL_KEYS
                    }
                }
            )
        )
    return out


def build_metrics_note(
    *,
    atm_iv: Optional[float],
    india_vix: Optional[float],
    pcr: float,
    pcr_sentiment: PcrSentiment,
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
        pcr_copy = pcr_interpretation(pcr, pcr_sentiment)
        parts.append(
            f"PCR at {pcr:.2f} ({pcr_sentiment.display_label}): {pcr_copy} "
            f"OI support near {oi_support:.0f} and resistance near {oi_resistance:.0f}."
        )
    return "\n\n".join(parts) if parts else "Live NIFTY options metrics."


def _norm_pdf(x: float) -> float:
    return exp(-0.5 * x * x) / sqrt(2.0 * pi)


def _time_to_expiry_years(expiry_iso: str) -> float:
    if not expiry_iso:
        return 0.0
    expiry_day = datetime.strptime(expiry_iso, "%Y-%m-%d").date()
    expiry_dt = datetime(
        expiry_day.year, expiry_day.month, expiry_day.day, 15, 30, tzinfo=IST
    )
    now = datetime.now(tz=IST)
    seconds = max((expiry_dt - now).total_seconds(), 0.0)
    return seconds / (365.0 * 24.0 * 3600.0)


def _pick_iv(row: OIStrikeRow) -> Optional[float]:
    values = [v for v in (row.ce_iv, row.pe_iv) if v is not None and v > 0]
    if not values:
        return None
    # Dhan IV can be in percent points; normalize to decimal vol.
    iv = sum(values) / len(values)
    return iv / 100.0 if iv > 1.0 else iv


def _bs_gamma(spot: float, strike: float, vol: float, t: float, r: float) -> float:
    if spot <= 0 or strike <= 0 or vol <= 0 or t <= 0:
        return 0.0
    sigma_t = vol * sqrt(t)
    if sigma_t <= 0:
        return 0.0
    d1 = (log(spot / strike) + (r + 0.5 * vol * vol) * t) / sigma_t
    return _norm_pdf(d1) / (spot * sigma_t)


def _build_gamma_insights(
    *,
    regime: str,
    direction: str,
    confidence: str,
    flip_zone: Optional[float],
    near_net_gamma: float,
    spot: float,
) -> list[str]:
    insights: list[str] = []
    regime_copy = regime.lower()
    if regime == "Positive":
        insights.append(
            "Estimated gamma remains positive near spot, which suggests movement may stay relatively dampened."
        )
    elif regime == "Negative":
        insights.append(
            "Estimated gamma is negative near spot, which suggests expansion risk can rise with directional moves."
        )
    else:
        insights.append(
            "Estimated gamma is near neutral, which suggests stabilizing pressure is limited at current levels."
        )

    insights.append(
        f"Estimated gamma pressure is currently {direction.lower()}, and this can influence short-term move sensitivity."
    )

    if flip_zone is not None:
        distance = abs(spot - flip_zone)
        if distance <= max(spot * 0.003, 40):
            insights.append(
                f"NIFTY is trading close to the gamma flip zone near {flip_zone:.0f}, where behavior may shift quickly."
            )
        else:
            insights.append(
                f"The nearest gamma flip zone is around {flip_zone:.0f}; staying away from it may keep the current {regime_copy} regime intact."
            )

    if confidence != "High":
        insights.append(
            f"Signal confidence is {confidence.lower()} because public-chain estimates can differ from actual positioning."
        )

    if abs(near_net_gamma) < 1e-6:
        insights.append(
            "Estimated net gamma near spot is weak, which indicates any stabilizing or weakening effect may be shallow."
        )

    return insights[:4]


def compute_estimated_gamma(
    *,
    rows: Iterable[OIStrikeRow],
    spot: float,
    expiry_iso: str,
    risk_free_rate: float = 0.06,
    contract_multiplier: int = 50,
    regime_changed_intraday: bool = False,
) -> GammaEstimate:
    strikes = sorted(list(rows), key=lambda r: r.strike)
    if not strikes or spot <= 0:
        return GammaEstimate(
            regime="Unavailable",
            status="unavailable",
            insights=["Estimated gamma unavailable due to incomplete option-chain inputs."],
        )

    t = _time_to_expiry_years(expiry_iso)
    if t <= 0:
        return GammaEstimate(
            regime="Unavailable",
            status="unavailable",
            insights=["Estimated gamma unavailable because expiry timing is too close or invalid."],
        )

    strike_exposures: list[tuple[float, float, OIStrikeRow, float]] = []
    valid_iv_count = 0
    for row in strikes:
        iv = _pick_iv(row)
        if iv is None:
            continue
        gamma = _bs_gamma(spot, row.strike, iv, t, risk_free_rate)
        call_exp = gamma * row.call_oi * contract_multiplier * spot * spot * 0.01
        put_exp = -gamma * row.put_oi * contract_multiplier * spot * spot * 0.01
        strike_exposures.append((row.strike, call_exp + put_exp, row, iv))
        valid_iv_count += 1

    iv_coverage = valid_iv_count / max(len(strikes), 1)
    if not strike_exposures or iv_coverage < 0.35:
        return GammaEstimate(
            regime="Unavailable",
            status="unavailable",
            confidence="Low",
            insights=["Estimated gamma unavailable due to insufficient IV coverage across strikes."],
        )

    near_band = max(spot * 0.02, 300.0)
    near = [
        exp for strike, exp, _row, _iv in strike_exposures if abs(strike - spot) <= near_band
    ]
    near_net_gamma = sum(near) if near else 0.0
    total_abs = sum(abs(exp) for _strike, exp, _row, _iv in strike_exposures)
    score = near_net_gamma / max(total_abs, 1.0)

    if score > 0.08:
        regime = "Positive"
    elif score < -0.08:
        regime = "Negative"
    else:
        regime = "Neutral"

    if regime == "Negative":
        direction = "Expansion Risk"
    elif regime == "Positive":
        direction = "Strengthening" if abs(score) >= 0.16 else "Weakening"
    else:
        direction = "Stable" if abs(score) < 0.02 else "Weakening"

    flip_candidates: list[float] = []
    for idx in range(1, len(strike_exposures)):
        left_strike, left_val, _left_row, _left_iv = strike_exposures[idx - 1]
        right_strike, right_val, _right_row, _right_iv = strike_exposures[idx]
        if left_val == 0:
            flip_candidates.append(left_strike)
            continue
        if left_val * right_val < 0:
            weight = abs(left_val) / (abs(left_val) + abs(right_val))
            flip_candidates.append(left_strike + (right_strike - left_strike) * weight)

    flip_zone: Optional[float] = None
    if flip_candidates:
        # Use the sign-change closest to current spot, not the first in chain order.
        nearest = min(flip_candidates, key=lambda zone: abs(zone - spot))
        # Guardrail: hide implausibly far flip zones rather than showing misleading values.
        max_allowed_distance = max(spot * 0.05, 600.0)
        if abs(nearest - spot) <= max_allowed_distance:
            flip_zone = nearest

    if iv_coverage >= 0.75 and t >= 1.0 / 365.0:
        confidence = "High"
        status = "ok"
    elif iv_coverage >= 0.5:
        confidence = "Medium"
        status = "low_confidence"
    else:
        confidence = "Low"
        status = "low_confidence"

    if flip_zone is None and status == "ok":
        # If we cannot resolve a credible nearby flip level, downgrade confidence.
        confidence = "Medium"
        status = "low_confidence"

    flip_distance_points = abs(spot - flip_zone) if flip_zone is not None else None
    flip_distance_percent = (
        (flip_distance_points / spot) * 100.0 if flip_distance_points is not None else None
    )

    positives = sorted(
        [entry for entry in strike_exposures if entry[1] > 0],
        key=lambda item: item[1],
        reverse=True,
    )
    negatives = sorted(
        [entry for entry in strike_exposures if entry[1] < 0],
        key=lambda item: item[1],
    )
    dominant_positive = [strike for strike, _exp, _row, _iv in positives[:3]]
    dominant_negative = [strike for strike, _exp, _row, _iv in negatives[:3]]

    above_concentration = sum(
        abs(exp) for strike, exp, _row, _iv in strike_exposures if strike > spot
    )
    below_concentration = sum(
        abs(exp) for strike, exp, _row, _iv in strike_exposures if strike < spot
    )
    total_concentration = above_concentration + below_concentration
    above_share = (
        (above_concentration / total_concentration) * 100.0
        if total_concentration > 0
        else None
    )
    below_share = (
        (below_concentration / total_concentration) * 100.0
        if total_concentration > 0
        else None
    )

    highest_impact = (
        min(strike_exposures, key=lambda item: (abs(item[0] - spot), -abs(item[1])))
        if strike_exposures
        else None
    )
    nearest_high_impact_strike = highest_impact[0] if highest_impact else None

    zone_candidates = sorted(
        strike_exposures, key=lambda item: (abs(item[0] - spot), -abs(item[1]))
    )[:5]
    if zone_candidates:
        zone_min = min(item[0] for item in zone_candidates)
        zone_max = max(item[0] for item in zone_candidates)
        tolerance = 25.0
        if spot < zone_min - tolerance:
            spot_position_vs_zone = "Below main gamma zone"
        elif spot > zone_max + tolerance:
            spot_position_vs_zone = "Above main gamma zone"
        else:
            spot_position_vs_zone = "Inside main gamma zone"
    else:
        spot_position_vs_zone = "Unknown"

    strike_contributions = sorted(
        strike_exposures,
        key=lambda item: (abs(item[0] - spot), -abs(item[1])),
    )[:16]
    contribution_rows: list[GammaStrikeContribution] = []
    for strike, exp, row, iv in strike_contributions:
        if flip_zone is not None and abs(strike - flip_zone) <= 25:
            contribution_label = "Flip-sensitive"
        elif exp >= 0:
            contribution_label = "Stabilizing"
        else:
            contribution_label = "Destabilizing"
        contribution_rows.append(
            GammaStrikeContribution(
                strike=round(strike, 2),
                estimated_gex=round(exp, 2),
                call_oi=row.call_oi,
                put_oi=row.put_oi,
                iv=round(iv * 100, 2),
                distance_from_spot=round(strike - spot, 2),
                contribution_label=contribution_label,
            )
        )

    insights = _build_gamma_insights(
        regime=regime,
        direction=direction,
        confidence=confidence,
        flip_zone=flip_zone,
        near_net_gamma=near_net_gamma,
        spot=spot,
    )
    return GammaEstimate(
        regime=regime,
        direction=direction,
        flip_zone=round(flip_zone, 2) if flip_zone is not None else None,
        flip_distance_points=(
            round(flip_distance_points, 2) if flip_distance_points is not None else None
        ),
        flip_distance_percent=(
            round(flip_distance_percent, 3) if flip_distance_percent is not None else None
        ),
        confidence=confidence,
        status=status,
        spot=round(spot, 2),
        near_net_gamma=round(near_net_gamma, 2),
        near_net_gamma_index=round(score * 100, 2),
        dominant_positive_strikes=[round(s, 2) for s in dominant_positive],
        dominant_negative_strikes=[round(s, 2) for s in dominant_negative],
        nearest_high_impact_strike=(
            round(nearest_high_impact_strike, 2)
            if nearest_high_impact_strike is not None
            else None
        ),
        gamma_concentration_above_spot=round(above_concentration, 2),
        gamma_concentration_below_spot=round(below_concentration, 2),
        gamma_concentration_above_share=round(above_share, 2) if above_share is not None else None,
        gamma_concentration_below_share=round(below_share, 2) if below_share is not None else None,
        spot_position_vs_zone=spot_position_vs_zone,
        regime_changed_intraday=regime_changed_intraday,
        strike_contributions=contribution_rows,
        insights=insights,
    )


def compute_price_oi_divergence(
    *,
    samples: list[PriceOiSnapshot],
) -> PriceOiDivergence:
    if len(samples) < 5:
        return PriceOiDivergence(
            status="unavailable",
            state="No Clear Divergence",
            confidence="Low",
            summary="Building divergence signal from live price and OI samples.",
            samples=[
                PriceOiSample(
                    timestamp=s.timestamp,
                    spot=round(s.spot, 2),
                    total_call_oi=s.total_call_oi,
                    total_put_oi=s.total_put_oi,
                    near_atm_call_oi=s.near_atm_call_oi,
                    near_atm_put_oi=s.near_atm_put_oi,
                    support_put_oi=s.support_put_oi,
                    resistance_call_oi=s.resistance_call_oi,
                )
                for s in samples[-20:]
            ],
        )

    now = samples[-1].timestamp

    def get_past(minutes: int) -> Optional[PriceOiSnapshot]:
        target = now - minutes * 60
        for item in reversed(samples):
            if item.timestamp <= target:
                return item
        return None

    base = get_past(15)
    window_minutes = 15
    if base is None:
        base = get_past(30)
        window_minutes = 30
    if base is None:
        return PriceOiDivergence(
            status="unavailable",
            state="No Clear Divergence",
            confidence="Low",
            window_minutes_used=window_minutes,
            summary="Insufficient rolling history for divergence classification.",
        )

    latest = samples[-1]
    price_change = latest.spot - base.spot
    price_change_pct = (price_change / base.spot) * 100 if base.spot else 0.0

    call_change = latest.total_call_oi - base.total_call_oi
    put_change = latest.total_put_oi - base.total_put_oi
    near_call_change = latest.near_atm_call_oi - base.near_atm_call_oi
    near_put_change = latest.near_atm_put_oi - base.near_atm_put_oi
    support_change = (
        (latest.support_put_oi - base.support_put_oi)
        if latest.support_put_oi is not None and base.support_put_oi is not None
        else None
    )
    resistance_change = (
        (latest.resistance_call_oi - base.resistance_call_oi)
        if latest.resistance_call_oi is not None and base.resistance_call_oi is not None
        else None
    )

    tiny_price_move = abs(price_change_pct) < 0.08
    low_oi_motion = abs(near_call_change) + abs(near_put_change) < 5_000
    if tiny_price_move or low_oi_motion:
        return PriceOiDivergence(
            state="No Clear Divergence",
            confidence="Low",
            status="low_confidence",
            window_minutes_used=window_minutes,
            summary="Price and near-ATM OI changes are too small for a reliable divergence signal.",
            price_change_points=round(price_change, 2),
            price_change_percent=round(price_change_pct, 3),
            total_call_oi_change=call_change,
            total_put_oi_change=put_change,
            near_atm_call_oi_change=near_call_change,
            near_atm_put_oi_change=near_put_change,
            support_zone_oi_change=support_change,
            resistance_zone_oi_change=resistance_change,
            insights=[
                "No clear divergence detected because recent price and near-spot OI movement is limited.",
                "Signal confidence is low while positioning pressure remains muted.",
            ],
            samples=[
                PriceOiSample(
                    timestamp=s.timestamp,
                    spot=round(s.spot, 2),
                    total_call_oi=s.total_call_oi,
                    total_put_oi=s.total_put_oi,
                    near_atm_call_oi=s.near_atm_call_oi,
                    near_atm_put_oi=s.near_atm_put_oi,
                    support_put_oi=s.support_put_oi,
                    resistance_call_oi=s.resistance_call_oi,
                )
                for s in samples[-20:]
            ],
        )

    price_up = price_change > 0
    near_put_build = near_put_change > 0
    near_call_build = near_call_change > 0
    total_put_build = put_change > 0
    total_call_build = call_change > 0

    if price_up and near_put_build and not near_call_build:
        state = "Confirmed Upmove"
        summary = "Price is rising with supportive near-ATM put-side positioning."
        confidence = "High"
    elif (not price_up) and near_call_build and not near_put_build:
        state = "Confirmed Downmove"
        summary = "Price is falling with rising near-ATM call-side pressure."
        confidence = "High"
    elif price_up and near_call_build and not near_put_build:
        state = "Weak Upmove"
        summary = "Price is rising, but near-ATM call-side buildup suggests weaker confirmation."
        confidence = "Medium"
    elif (not price_up) and near_put_build and not near_call_build:
        state = "Weak Downmove"
        summary = "Price is falling, but near-ATM put-side buildup suggests weaker downside confirmation."
        confidence = "Medium"
    elif (not price_up) and total_call_build and near_call_build:
        state = "Short Buildup Pressure"
        summary = "Call-side OI is building as price softens, indicating pressure is strengthening."
        confidence = "Medium"
    elif price_up and (not total_call_build) and (not total_put_build):
        state = "Covering-Led Move"
        summary = "Price rise appears covering-led as broad OI unwinds."
        confidence = "Medium"
    elif (price_up and near_call_build and near_put_build) or (
        (not price_up) and near_call_build and near_put_build
    ):
        state = "Divergent Drift"
        summary = "Near-ATM OI is conflicted while price trends, indicating mixed positioning."
        confidence = "Low"
    else:
        state = "No Clear Divergence"
        summary = "No stable divergence state is detected from current price and OI behavior."
        confidence = "Low"

    insights: list[str] = []
    if state in {"Weak Upmove", "Weak Downmove", "Divergent Drift"}:
        insights.append(
            "Price and near-ATM OI behavior is conflicted, which suggests confirmation is weakening."
        )
    else:
        insights.append(
            "Price and near-ATM OI direction shows stronger agreement, indicating better move confirmation."
        )
    if abs(near_put_change) > abs(put_change) * 0.6 or abs(near_call_change) > abs(call_change) * 0.6:
        insights.append(
            "Near-ATM OI is moving faster than total OI, indicating local strike pressure is driving the signal."
        )
    if support_change is not None and resistance_change is not None:
        if price_up and resistance_change > 0:
            insights.append(
                "Resistance-zone call OI is building while price rises, which indicates overhead pressure is still active."
            )
        elif (not price_up) and support_change > 0:
            insights.append(
                "Support-zone put OI is building while price falls, which suggests downside confirmation may be contested."
            )
    if state == "Covering-Led Move":
        insights.append(
            "Current move appears covering-led rather than fresh positioning-led."
        )
    insights = insights[:4] if insights else ["No clear divergence detected between price and OI behavior."]

    return PriceOiDivergence(
        state=state,
        confidence=confidence,
        status="ok" if confidence != "Low" else "low_confidence",
        window_minutes_used=window_minutes,
        summary=summary,
        price_change_points=round(price_change, 2),
        price_change_percent=round(price_change_pct, 3),
        total_call_oi_change=call_change,
        total_put_oi_change=put_change,
        near_atm_call_oi_change=near_call_change,
        near_atm_put_oi_change=near_put_change,
        support_zone_oi_change=support_change,
        resistance_zone_oi_change=resistance_change,
        insights=insights,
        samples=[
            PriceOiSample(
                timestamp=s.timestamp,
                spot=round(s.spot, 2),
                total_call_oi=s.total_call_oi,
                total_put_oi=s.total_put_oi,
                near_atm_call_oi=s.near_atm_call_oi,
                near_atm_put_oi=s.near_atm_put_oi,
                support_put_oi=s.support_put_oi,
                resistance_call_oi=s.resistance_call_oi,
            )
            for s in samples[-20:]
        ],
    )

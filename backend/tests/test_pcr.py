"""Tests for OI-based PCR classification."""

from __future__ import annotations

import pytest

from app.market.metrics_compute import (
    PCR_BALANCED_LOW,
    PCR_EXTREME_CALL,
    PCR_EXTREME_PUT,
    PCR_PUT_HEAVY,
    classify_pcr,
    pcr_interpretation,
    pcr_sentiment,
)


@pytest.mark.parametrize(
    ("pcr", "label", "extreme"),
    [
        (1.6, "Bullish", "Reversal Down"),
        (1.51, "Bullish", "Reversal Down"),
        (1.5, "Bullish", None),
        (1.35, "Bullish", None),
        (1.21, "Bullish", None),
        (1.2, "Neutral", None),
        (1.0, "Neutral", None),
        (0.8, "Neutral", None),
        (0.79, "Bearish", None),
        (0.5, "Bearish", None),
        (0.49, "Bearish", "Reversal Up"),
        (0.3, "Bearish", "Reversal Up"),
    ],
)
def test_classify_pcr_bands(pcr: float, label: str, extreme: str | None) -> None:
    result = classify_pcr(pcr)
    assert result.label == label
    assert result.extreme == extreme


def test_pcr_sentiment_display_label_includes_extreme() -> None:
    assert pcr_sentiment(1.6) == "Bullish · Reversal Down"
    assert pcr_sentiment(1.0) == "Neutral"
    assert pcr_sentiment(0.4) == "Bearish · Reversal Up"


def test_pcr_interpretation_extreme_put_writing() -> None:
    sentiment = classify_pcr(1.55)
    text = pcr_interpretation(1.55, sentiment)
    assert "excessive put writing" in text
    assert "reversal down" in text


def test_pcr_interpretation_extreme_call_writing() -> None:
    sentiment = classify_pcr(0.45)
    text = pcr_interpretation(0.45, sentiment)
    assert "excessive call writing" in text
    assert "reversal up" in text


def test_threshold_constants() -> None:
    assert PCR_PUT_HEAVY == 1.2
    assert PCR_BALANCED_LOW == 0.8
    assert PCR_EXTREME_PUT == 1.5
    assert PCR_EXTREME_CALL == 0.5

from __future__ import annotations

from bisect import bisect_right
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from time import time
from typing import Optional

IST = timezone(timedelta(hours=5, minutes=30))


@dataclass(frozen=True)
class PriceOiSnapshot:
    timestamp: int
    spot: float
    total_call_oi: int
    total_put_oi: int
    near_atm_call_oi: int
    near_atm_put_oi: int
    support_put_oi: Optional[int] = None
    resistance_call_oi: Optional[int] = None


class PriceOiDivergenceStore:
    """Intraday rolling series for price-vs-OI divergence."""

    def __init__(self, max_age_seconds: int = 6 * 3600) -> None:
        self._max_age = max_age_seconds
        self._session_key: Optional[str] = None
        self._timestamps: list[int] = []
        self._samples: list[PriceOiSnapshot] = []

    def _session_for_ts(self, ts: int) -> str:
        return datetime.fromtimestamp(ts, tz=IST).date().isoformat()

    def record(self, sample: PriceOiSnapshot, ts: Optional[int] = None) -> None:
        now = int(ts if ts is not None else time())
        session_key = self._session_for_ts(now)
        if self._session_key != session_key:
            self._session_key = session_key
            self._timestamps = []
            self._samples = []

        if self._timestamps and self._timestamps[-1] == sample.timestamp:
            self._samples[-1] = sample
        else:
            self._timestamps.append(sample.timestamp)
            self._samples.append(sample)
        self._prune(now)

    def _prune(self, now: int) -> None:
        cutoff = now - self._max_age
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.pop(0)
            self._samples.pop(0)

    def lookup_at(self, target_ts: int) -> Optional[PriceOiSnapshot]:
        if not self._timestamps:
            return None
        idx = bisect_right(self._timestamps, target_ts) - 1
        if idx < 0:
            return None
        return self._samples[idx]

    def recent(self, limit: int = 60) -> list[PriceOiSnapshot]:
        return self._samples[-limit:]


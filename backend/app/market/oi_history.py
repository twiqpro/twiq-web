from bisect import bisect_right
from typing import Optional
from dataclasses import dataclass
from time import time

from app.market.oi_intervals import OI_HISTORY_MAX_AGE_SEC


@dataclass(frozen=True)
class StrikeOiSnapshot:
    call_oi: int
    put_oi: int


class OiHistoryStore:
    """In-memory ring buffer of full-chain OI snapshots for interval change."""

    def __init__(self, max_age_seconds: int = OI_HISTORY_MAX_AGE_SEC) -> None:
        self._max_age = max_age_seconds
        self._timestamps: list[int] = []
        self._snapshots: list[dict[float, StrikeOiSnapshot]] = []

    def record(
        self,
        strikes: dict[float, StrikeOiSnapshot],
        ts: Optional[int] = None,
    ) -> None:
        now = int(ts if ts is not None else time())
        if self._timestamps and self._timestamps[-1] == now:
            self._snapshots[-1] = strikes
            return
        self._timestamps.append(now)
        self._snapshots.append(strikes)
        self._prune(now)

    def _prune(self, now: int) -> None:
        cutoff = now - self._max_age
        while self._timestamps and self._timestamps[0] < cutoff:
            self._timestamps.pop(0)
            self._snapshots.pop(0)

    def lookup_at(self, target_ts: int) -> dict[float, StrikeOiSnapshot] | None:
        if not self._timestamps:
            return None
        idx = bisect_right(self._timestamps, target_ts) - 1
        if idx < 0:
            return None
        return self._snapshots[idx]

    @property
    def oldest_ts(self) -> Optional[int]:
        return self._timestamps[0] if self._timestamps else None

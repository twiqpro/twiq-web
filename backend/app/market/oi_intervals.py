from __future__ import annotations

OI_INTERVAL_KEYS: tuple[str, ...] = ("1M", "5M", "15M", "30M", "1H", "4H")

OI_INTERVAL_MINUTES: dict[str, int] = {
    "1M": 1,
    "5M": 5,
    "15M": 15,
    "30M": 30,
    "1H": 60,
    "4H": 240,
}

# Keep ~4h of 1-minute snapshots (plus buffer)
OI_HISTORY_MAX_AGE_SEC = 4 * 3600 + 600

SNAPSHOT_INTERVAL_SEC = 60

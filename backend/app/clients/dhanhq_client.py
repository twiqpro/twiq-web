from __future__ import annotations

import asyncio
import csv
import io
import logging
from datetime import datetime, timedelta
from typing import Any, Optional
from zoneinfo import ZoneInfo

import httpx

from app.auth.dhanhq_oauth import DhanHQAuthError, DhanHQOAuth
from app.clients.exceptions import DhanHQAPIError
from app.config import Settings, get_settings
from app.models.market import CandleData

logger = logging.getLogger(__name__)

IST = ZoneInfo("Asia/Kolkata")

INTRADAY_INTERVAL_MAP = {
    "1M": "1",
    "5M": "5",
    "15M": "15",
    "25M": "25",
    "1H": "60",
}

MAX_RETRIES = 3
RETRY_BASE_DELAY = 0.5


class DhanHQClient:
    """DhanHQ REST client (minimal subset for realtime NIFTY chart)."""

    def __init__(
        self,
        settings: Optional[Settings] = None,
        oauth: Optional[DhanHQOAuth] = None,
    ) -> None:
        self.settings = settings or get_settings()
        self.oauth = oauth or DhanHQOAuth(self.settings)
        self._base = self.settings.dhanhq_base_url.rstrip("/")

    def _auth_headers(self) -> dict[str, str]:
        try:
            headers = self.oauth.auth_headers()
        except DhanHQAuthError as exc:
            raise DhanHQAPIError(str(exc), status_code=401) from exc
        headers["Content-Type"] = "application/json"
        return headers

    async def _request_text(
        self,
        method: str,
        url: str,
    ) -> str:
        last_error: Optional[Exception] = None
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.request(method, url)
                if response.status_code >= 400:
                    if response.status_code >= 500 and attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_BASE_DELAY * (2**attempt))
                        continue
                    raise DhanHQAPIError(
                        f"DhanHQ text request failed ({response.status_code}): "
                        f"{response.text[:400]}",
                        status_code=response.status_code,
                    )
                return response.text
            except (httpx.TransportError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning(
                    "DhanHQ text request error (attempt %s): %s", attempt + 1, exc
                )
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BASE_DELAY * (2**attempt))
        raise DhanHQAPIError(f"DhanHQ text request failed after retries: {last_error}")

    async def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
    ) -> Any:
        url = f"{self._base}{path}"
        last_error: Optional[Exception] = None

        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    response = await client.request(
                        method,
                        url,
                        headers=self._auth_headers(),
                        json=json_body,
                        params=params,
                    )

                if response.status_code >= 400:
                    if response.status_code >= 500 and attempt < MAX_RETRIES - 1:
                        await asyncio.sleep(RETRY_BASE_DELAY * (2**attempt))
                        continue
                    raise DhanHQAPIError(
                        f"DhanHQ {path} failed ({response.status_code}): "
                        f"{response.text[:400]}",
                        status_code=response.status_code,
                    )

                if not response.content:
                    return {}
                return response.json()

            except (httpx.TransportError, httpx.TimeoutException) as exc:
                last_error = exc
                logger.warning("DhanHQ request error (attempt %s): %s", attempt + 1, exc)
                if attempt < MAX_RETRIES - 1:
                    await asyncio.sleep(RETRY_BASE_DELAY * (2**attempt))

        raise DhanHQAPIError(f"DhanHQ request failed after retries: {last_error}")

    @staticmethod
    def parse_ohlc_response(data: dict[str, Any]) -> list[CandleData]:
        opens = data.get("open") or []
        if not opens:
            return []

        highs = data.get("high") or []
        lows = data.get("low") or []
        closes = data.get("close") or []
        volumes = data.get("volume") or []
        timestamps = data.get("timestamp") or []
        oi_list = data.get("open_interest")

        candles: list[CandleData] = []
        for i in range(len(timestamps)):
            oi_val = None
            if oi_list and i < len(oi_list):
                oi_val = int(oi_list[i]) if oi_list[i] else None
            candles.append(
                CandleData(
                    timestamp=int(timestamps[i]),
                    open=float(opens[i]),
                    high=float(highs[i]),
                    low=float(lows[i]),
                    close=float(closes[i]),
                    volume=int(volumes[i]) if i < len(volumes) else 0,
                    open_interest=oi_val,
                )
            )
        return candles

    async def get_daily_historical(
        self,
        security_id: str,
        exchange_segment: str,
        instrument: str,
        from_date: str,
        to_date: str,
        *,
        expiry_code: int = 0,
        include_oi: bool = False,
    ) -> list[CandleData]:
        body = {
            "securityId": security_id,
            "exchangeSegment": exchange_segment,
            "instrument": instrument,
            "expiryCode": expiry_code,
            "oi": include_oi,
            "fromDate": from_date,
            "toDate": to_date,
        }
        data = await self._request("POST", "/charts/historical", json_body=body)
        return self.parse_ohlc_response(data)

    async def get_intraday_historical(
        self,
        security_id: str,
        exchange_segment: str,
        instrument: str,
        interval: str,
        from_date: str,
        to_date: str,
        *,
        include_oi: bool = False,
    ) -> list[CandleData]:
        minute = INTRADAY_INTERVAL_MAP.get(interval.upper())
        if not minute:
            raise DhanHQAPIError(f"Unsupported intraday interval: {interval}")

        body = {
            "securityId": security_id,
            "exchangeSegment": exchange_segment,
            "instrument": instrument,
            "interval": minute,
            "oi": include_oi,
            "fromDate": from_date,
            "toDate": to_date,
        }
        data = await self._request("POST", "/charts/intraday", json_body=body)
        return self.parse_ohlc_response(data)

    async def get_historical_data(
        self,
        security_id: str,
        exchange_segment: str,
        instrument: str,
        interval: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        *,
        limit: int = 100,
        include_oi: bool = False,
    ) -> list[CandleData]:
        interval = interval.upper()
        to_dt = datetime.now(IST)
        if interval == "1D":
            if not to_date:
                to_date = to_dt.strftime("%Y-%m-%d")
            if not from_date:
                from_date = (to_dt - timedelta(days=max(limit, 30))).strftime("%Y-%m-%d")
            candles = await self.get_daily_historical(
                security_id,
                exchange_segment,
                instrument,
                from_date,
                to_date,
                include_oi=include_oi,
            )
        else:
            if not to_date:
                to_date = to_dt.strftime("%Y-%m-%d %H:%M:%S")
            if not from_date:
                from_date = (to_dt - timedelta(days=5)).strftime("%Y-%m-%d %H:%M:%S")
            candles = await self.get_intraday_historical(
                security_id,
                exchange_segment,
                instrument,
                interval,
                from_date,
                to_date,
                include_oi=include_oi,
            )

        if limit and len(candles) > limit:
            candles = candles[-limit:]
        return candles

    async def get_option_expiries(
        self,
        underlying_scrip: str | int,
        underlying_seg: str,
    ) -> list[str]:
        body = {
            "UnderlyingScrip": int(underlying_scrip),
            "UnderlyingSeg": underlying_seg,
        }
        data = await self._request("POST", "/optionchain/expirylist", json_body=body)
        payload = data.get("data") if isinstance(data, dict) else None
        if isinstance(payload, list):
            return [str(x) for x in payload]
        return []

    async def get_option_chain(
        self,
        underlying_scrip: str | int,
        underlying_seg: str,
        expiry: str,
    ) -> dict[str, Any]:
        body = {
            "UnderlyingScrip": int(underlying_scrip),
            "UnderlyingSeg": underlying_seg,
            "Expiry": expiry,
        }
        return await self._request("POST", "/optionchain", json_body=body)

    async def resolve_next_index_future(
        self,
        preferred_symbols: list[str],
    ) -> Optional[dict[str, str]]:
        """Resolve nearest-expiry index future from Dhan scrip master.

        Tries symbols in order (e.g. GIFTNIFTY first, then NIFTY).
        Returns dict with security_id, exchange_segment and symbol, or None.
        """
        csv_text = await self._request_text("GET", self.settings.dhanhq_scrip_master_url)
        reader = csv.DictReader(io.StringIO(csv_text))
        now = datetime.now(IST)

        rows: list[dict[str, Any]] = []
        for row in reader:
            if row.get("SEM_SEGMENT") != "D":
                continue
            if row.get("SEM_INSTRUMENT_NAME") != "FUTIDX":
                continue
            if row.get("SEM_EXM_EXCH_ID") != "NSE":
                continue

            trading_symbol = (row.get("SEM_TRADING_SYMBOL") or "").strip().upper()
            if "-FUT" not in trading_symbol:
                continue
            base_symbol = trading_symbol.split("-")[0]

            expiry_raw = (row.get("SEM_EXPIRY_DATE") or "").strip()
            if not expiry_raw:
                continue
            try:
                expiry_dt = datetime.strptime(expiry_raw, "%Y-%m-%d %H:%M:%S").replace(
                    tzinfo=IST
                )
            except ValueError:
                continue

            if expiry_dt < now:
                continue

            security_id = (row.get("SEM_SMST_SECURITY_ID") or "").strip()
            if not security_id:
                continue

            rows.append(
                {
                    "base_symbol": base_symbol,
                    "security_id": security_id,
                    "expiry": expiry_dt,
                    "trading_symbol": trading_symbol,
                }
            )

        if not rows:
            return None

        normalized_preferences = [s.strip().upper() for s in preferred_symbols if s.strip()]
        if not normalized_preferences:
            normalized_preferences = ["NIFTY"]

        for pref in normalized_preferences:
            candidates = [r for r in rows if r["base_symbol"] == pref]
            if not candidates:
                continue
            nearest = min(candidates, key=lambda r: r["expiry"])
            return {
                "security_id": nearest["security_id"],
                "exchange_segment": "NSE_FNO",
                "symbol": nearest["trading_symbol"],
            }

        return None

    async def get_market_ohlc(
        self,
        instruments: dict[str, list[int]],
    ) -> dict[str, Any]:
        """POST /marketfeed/ohlc — keys are exchange segments e.g. IDX_I, NSE_FNO."""
        return await self._request("POST", "/marketfeed/ohlc", json_body=instruments)

    @staticmethod
    def extract_segment_quote(
        data: dict[str, Any],
        exchange_segment: str,
        security_id: str | int,
    ) -> tuple[Optional[float], Optional[float]]:
        """Return (last_price, previous_close) for one instrument."""
        payload = data.get("data") if isinstance(data, dict) else None
        if not isinstance(payload, dict):
            return None, None
        segment = payload.get(exchange_segment) or {}
        row = segment.get(str(security_id)) or segment.get(int(security_id))  # type: ignore[arg-type]
        if not isinstance(row, dict):
            return None, None
        ltp = row.get("last_price")
        ohlc = row.get("ohlc") or {}
        prev = ohlc.get("close") if isinstance(ohlc, dict) else None
        try:
            last = float(ltp) if ltp is not None else None
        except (TypeError, ValueError):
            last = None
        try:
            close = float(prev) if prev is not None else None
        except (TypeError, ValueError):
            close = None
        return last, close


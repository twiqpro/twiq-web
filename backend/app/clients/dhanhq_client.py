from __future__ import annotations

import asyncio
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


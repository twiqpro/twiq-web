from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.auth.dhanhq_oauth import DhanHQAuthError
from app.clients.dhanhq_client import DhanHQClient
from app.clients.exceptions import DhanHQAPIError
from app.config import get_settings
from app.models.market import HistoricalDataResponse
from app.models.metrics import NiftyMetricsSnapshot
from app.websocket.metrics_manager import metrics_manager

router = APIRouter(prefix="/api/nifty", tags=["NIFTY"])
settings = get_settings()
client = DhanHQClient()


@router.get("/config")
async def nifty_config() -> dict:
    return {
        "symbol": "NIFTY",
        "security_id": settings.nifty_security_id,
        "exchange_segment": settings.nifty_exchange_segment,
        "instrument": settings.nifty_instrument,
        "display_name": "Nifty 50 Index",
        "default_interval": settings.nifty_default_interval,
        "websocket_url": "/ws/nifty",
    }


@router.get("/historical", response_model=HistoricalDataResponse)
async def nifty_historical(
    interval: str = "5M",
    limit: int = 200,
) -> HistoricalDataResponse:
    try:
        candles = await client.get_historical_data(
            settings.nifty_security_id,
            settings.nifty_exchange_segment,
            settings.nifty_instrument,
            interval,
            limit=limit,
            include_oi=False,
        )
    except DhanHQAuthError as exc:
        raise HTTPException(
            status_code=401,
            detail=f"{exc}. Login at /api/auth/dhan/login",
        ) from exc
    except DhanHQAPIError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc

    if not candles:
        raise HTTPException(status_code=404, detail="No NIFTY historical data")

    return HistoricalDataResponse(
        symbol="NIFTY",
        security_id=settings.nifty_security_id,
        exchange_segment=settings.nifty_exchange_segment,
        interval=interval.upper(),
        candles=candles,
        count=len(candles),
    )


@router.get("/metrics", response_model=NiftyMetricsSnapshot)
async def nifty_metrics(
    expiry: Optional[str] = Query(None, description="YYYY-MM-DD; nearest if omitted"),
) -> NiftyMetricsSnapshot:
    try:
        data = await metrics_manager.get_snapshot(expiry=expiry)
        if not data:
            raise HTTPException(status_code=503, detail="Metrics not ready")
        return NiftyMetricsSnapshot.model_validate(data)
    except DhanHQAuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    except DhanHQAPIError as exc:
        raise HTTPException(status_code=exc.status_code or 502, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


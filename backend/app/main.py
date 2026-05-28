from typing import Optional

from fastapi import FastAPI, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routes import nifty
from app.clients.dhanhq_client import DhanHQClient
from app.websocket.manager import manager as nifty_ws_manager
from app.websocket.metrics_manager import metrics_manager as nifty_metrics_manager

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Market structure chart engine backend",
    version="0.1.0",
    debug=settings.debug,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    # Cloudflare Workers preview + twiq.pro (even if CORS_ORIGINS env is stale)
    allow_origin_regex=r"https://([a-z0-9-]+\.)*(workers\.dev|twiq\.pro)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(nifty.router)


@app.websocket("/ws/nifty")
async def websocket_nifty(
    websocket: WebSocket,
    interval: str = Query("5M", description="1M, 5M, 15M, 1H, 1D"),
) -> None:
    try:
        await nifty_ws_manager.connect(websocket, timeframe=interval)
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await nifty_ws_manager.disconnect(websocket)
    except Exception as exc:  # pragma: no cover
        try:
            await websocket.send_json(
                {"type": "error", "symbol": "NIFTY", "message": str(exc)}
            )
        finally:
            await websocket.close()


@app.websocket("/ws/metrics")
async def websocket_metrics(
    websocket: WebSocket,
    expiry: Optional[str] = Query(None, description="YYYY-MM-DD"),
    oi_interval: str = Query("15M", description="1M, 5M, 15M, 30M, 1H, 4H"),
) -> None:
    try:
        await nifty_metrics_manager.connect(
            websocket,
            expiry=expiry,
            oi_interval=oi_interval,
        )
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        await nifty_metrics_manager.disconnect(websocket)
    except Exception as exc:  # pragma: no cover
        try:
            await websocket.send_json(
                {"type": "error", "symbol": "NIFTY", "message": str(exc)}
            )
        finally:
            await websocket.close()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "environment": settings.environment}

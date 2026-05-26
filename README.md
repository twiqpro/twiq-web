# TWIQ Web

Market structure chart engine for web and embeddable React Native WebView use. Realtime NIFTY visualization with candlesticks, EMA, volume, and open interest — powered by **DhanHQ** data.

## Stack

| Layer    | Tech                                                          |
| -------- | ------------------------------------------------------------- |
| Frontend | Next.js, TypeScript, Tailwind, TradingView Lightweight Charts |
| Backend  | FastAPI, WebSockets, Redis                                    |
| Data     | DhanHQ API                                                    |

## Project structure

```
├── frontend/          # Next.js chart UI
├── backend/           # FastAPI API + WebSocket
├── scripts/           # Dev startup scripts
├── .github/           # CI workflows, issue/PR templates
├── docker-compose.yml # Redis (local)
└── Plan.md            # Full phased roadmap
```

## Quick start

### 1. Environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Copy env files and add **API key + secret** from [web.dhan.co](https://web.dhan.co) → My Profile → Access DhanHQ APIs → **API key** tab.

| Variable              | Description                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `DHANHQ_APP_ID`       | API key (`app_id`)                                                                                          |
| `DHANHQ_APP_SECRET`   | API secret                                                                                                  |
| `DHANHQ_CLIENT_ID`    | Your Dhan client ID                                                                                         |
| `DHANHQ_REDIRECT_URL` | Must match redirect URL registered with the API key (default: `http://localhost:8000/api/auth/dhan/callback`) |

**One-time login** (required for realtime chart):

1. Open http://localhost:8000/api/auth/dhan/login
2. Sign in on Dhan's page
3. After redirect, the access token is saved to `backend/.dhan_token.json` (~24h validity)

After login, the chart loads **real historical candles** from `GET /api/nifty/historical` and updates live over `WS /ws/nifty`.

### 2. Redis (optional)

```bash
docker compose up -d redis
# or: ./scripts/dev-redis.sh
```

### 3. Backend

```bash
./scripts/dev-backend.sh
```

Health check: http://localhost:8000/health  
API docs: http://localhost:8000/docs

### 4. Frontend

```bash
./scripts/dev-frontend.sh
```

Open http://localhost:3000

### 5. Run tests

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest tests/ -v
```

## Implementation phases

See [Plan.md](./Plan.md) for the full roadmap. Phase 1 (foundation) is complete; Phases 2–10 are upcoming.

## Reference implementation

Working DhanHQ integration, chart components, and tests live in [twiqpro/Tqiqpro](https://github.com/twiqpro/Tqiqpro). TWIQ Web follows the same architecture and will port modules incrementally.

## References

- [DhanHQ API v2](https://dhanhq.co/docs/v2/)
- [TradingView Lightweight Charts](https://tradingview.github.io/lightweight-charts/)

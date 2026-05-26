# TWIQ Web — Implementation Roadmap

Phased delivery plan for the market structure chart engine.

## Phase 1 — Foundation (scaffold complete)

- [x] Monorepo structure (`frontend/`, `backend/`, `scripts/`)
- [x] FastAPI shell with `/health`
- [x] Next.js shell with placeholder UI
- [x] Redis via Docker Compose
- [x] Dev startup scripts
- [x] GitHub CI workflows and issue templates

## Phase 2 — DhanHQ REST + historical API

- [ ] DhanHQ OAuth flow (`backend/app/auth/`)
- [ ] API client (`backend/app/clients/`)
- [ ] Historical candles endpoint
- [ ] Instrument search endpoint
- [ ] Redis caching layer

Reference: [twiqpro/Tqiqpro](https://github.com/twiqpro/Tqiqpro)

## Phase 3 — Charting (Lightweight Charts)

- [ ] NIFTY chart component
- [ ] Timeframe selector
- [ ] Historical data load on open
- [ ] Frontend API client integration

## Phase 4 — EMA indicators

- [ ] Backend EMA calculation
- [ ] EMA overlay on chart
- [ ] EMA legend UI

## Phase 5 — Volume & open interest

- [ ] Volume histogram
- [ ] OI profile overlay
- [ ] F&O data support

## Phase 6–7 — WebSocket realtime

- [ ] DhanHQ binary feed parser
- [ ] Candle aggregator
- [ ] WebSocket manager
- [ ] Live candle streaming to frontend

## Phase 8 — Mobile WebView bridge

- [ ] React Native WebView embed contract
- [ ] PostMessage bridge for mobile app integration

## Phase 9–10 — Deploy & QA

- [ ] Production Docker/deployment config
- [ ] GitHub deploy workflows
- [ ] End-to-end QA and performance testing

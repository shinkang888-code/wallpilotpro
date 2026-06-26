# WallPilot Pro — Extension Sidecar Services

Optional Python services for full TradingAgents / TradeMaster integration.
WallPilot Pro runs standalone on Vercel with TypeScript fallbacks when these are not deployed.

## TradingAgents API (Phase 2)

```bash
cd services/tradingagents-api
pip install fastapi uvicorn tradingagents
uvicorn main:app --host 0.0.0.0 --port 8100
```

Set on Vercel: `TRADINGAGENTS_SERVICE_URL=https://your-service` (base URL without path).

Deploy guide: [`docs/TRADINGAGENTS_SIDECAR_DEPLOY.md`](../docs/TRADINGAGENTS_SIDECAR_DEPLOY.md)

Sidecar env: `GEMINI_API_KEY` or `OPENAI_API_KEY`, optional `TRADINGAGENTS_DEEP_MODEL`, `TRADINGAGENTS_QUICK_MODEL`.

## TradeMaster Worker (Phase 4 · Full RL)

WallPilot-compatible worker (train → test API):

```bash
cd services/trademaster-worker
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8089
```

**Railway (recommended):** see [`docs/TRADEMASTER_WORKER_DEPLOY.md`](../docs/TRADEMASTER_WORKER_DEPLOY.md)

**Official GPU RL:** deploy `_repo-analysis/TradeMaster/deploy/backend_service.py` on conda VM (same API paths).

Set on Vercel: `TRADEMASTER_SERVICE_URL=https://your-worker` (no trailing slash)

Health: `GET /api/TradeMaster/healthcheck` → `{ "error_code": 0 }`

## DartLab Sidecar (DARTLAB menu)

```bash
cd services/dartlab-api
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8200
```

Set: `DARTLAB_SERVICE_URL=https://your-service` and `OPENDART_API_KEY` for live OpenDART fetch.

## AI-Trader Federation (Phase 3)

Set: `AIT_SERVICE_URL=https://ai4trade.ai` (or self-hosted AI-Trader FastAPI)

WallPilot reads `/api/signals/feed` when configured; otherwise uses Supabase `ait_signals` table.

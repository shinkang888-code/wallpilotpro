# WallPilot Pro — Extension Sidecar Services

Optional Python services for full TradingAgents / TradeMaster integration.
WallPilot Pro runs standalone on Vercel with TypeScript fallbacks when these are not deployed.

## TradingAgents API (Phase 2)

```bash
cd services/tradingagents-api
pip install fastapi uvicorn tradingagents
uvicorn main:app --host 0.0.0.0 --port 8100
```

Set on Vercel: `TRADINGAGENTS_SERVICE_URL=https://your-service/propagate` base URL without path.

## TradeMaster Worker (Phase 4)

Deploy `c:\cursor\wallpilot\_repo-analysis\TradeMaster\deploy\backend_service.py` on GPU/CPU VM.

Set: `TRADEMASTER_SERVICE_URL=https://your-worker`

## AI-Trader Federation (Phase 3)

Set: `AIT_SERVICE_URL=https://ai4trade.ai` (or self-hosted AI-Trader FastAPI)

WallPilot reads `/api/signals/feed` when configured; otherwise uses Supabase `ait_signals` table.

# TradingAgents Sidecar — Render / Railway / VM deploy

WallPilot Pro **Agent Desk** (`/agents/desk`) uses this FastAPI wrapper around
[TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents).

When `TRADINGAGENTS_SERVICE_URL` is set on Vercel, analysis runs upstream
`TradingAgentsGraph.propagate()` for full LangGraph multi-agent output.

## API

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | `{ "status": "ok", "service": "tradingagents-api" }` |
| POST | `/propagate` | Body: `{ "ticker": "NVDA", "date": "2026-06-25" }` |

## Local run

```bash
cd services/tradingagents-api
pip install -r requirements.txt
export GEMINI_API_KEY=your_key   # or OPENAI_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8100
```

Health check:

```bash
curl http://127.0.0.1:8100/health
```

## Environment variables (sidecar host)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` or `GOOGLE_API_KEY` | One of LLM keys | Google Gemini provider |
| `OPENAI_API_KEY` | Alternative | OpenAI provider |
| `TRADINGAGENTS_DEEP_MODEL` | Optional | Default `gemini-2.0-flash` / `gpt-4o-mini` |
| `TRADINGAGENTS_QUICK_MODEL` | Optional | Quick-think model |
| `TRADINGAGENTS_MAX_DEBATE_ROUNDS` | Optional | Default `1` |
| `TRADINGAGENTS_MAX_RISK_ROUNDS` | Optional | Default `1` |
| `PORT` | Optional | Default `8100` |

## Vercel (WallPilot Pro)

Set on the **WallPilot** project (not the sidecar):

```
TRADINGAGENTS_SERVICE_URL=https://your-sidecar-host
```

No trailing slash. After deploy, open `/agents/desk` → **TradingAgents 전체 기능 설정** → **상태 새로고침**.

## Render (Blueprint)

`render.yaml` includes `wallpilot-tradingagents-api`. After deploy:

1. Render Dashboard → service → Environment → add `GEMINI_API_KEY`
2. Copy service URL → Vercel `TRADINGAGENTS_SERVICE_URL`

## Railway

1. New service → root directory `services/tradingagents-api`
2. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Add `GEMINI_API_KEY`, health path `/health`

## Docker

```bash
docker build -t wallpilot-ta-api services/tradingagents-api
docker run -p 8100:8100 -e GEMINI_API_KEY=... wallpilot-ta-api
```

## Fallback

If the sidecar is offline, Agent Desk **Auto** mode falls back to the TypeScript
pipeline (structured tabs still work). **Python only** mode requires a live sidecar.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Agent Desk shows "폴백 모드" | Set `TRADINGAGENTS_SERVICE_URL` on Vercel |
| Sidecar offline | Check `/health`, LLM key on sidecar host |
| 502 on propagate | Increase timeout; LLM key valid; ticker format (e.g. `NVDA`, `005930.KS`) |
| Vercel timeout | Sidecar may need 30–60s; TS structured data still returns |

## Related

- UI: `/agents/desk`
- Code: `services/tradingagents-api/main.py`
- Client: `src/lib/modules/ta/tradingagents-client.server.ts`
- Analysis: `docs/TRADINGAGENTS_ANALYSIS.md`

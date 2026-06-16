"""TradingAgents FastAPI sidecar for WallPilot Pro Agent Desk."""
from datetime import date

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="WallPilot TradingAgents Sidecar")


class PropagateRequest(BaseModel):
    ticker: str
    date: str | None = None
    analysts: list[str] | None = None


@app.get("/health")
def health():
    return {"status": "ok", "service": "tradingagents-api"}


@app.post("/propagate")
def propagate(body: PropagateRequest):
    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph

        trade_date = body.date or date.today().isoformat()
        graph = TradingAgentsGraph()
        final_state, rating = graph.propagate(body.ticker, trade_date)
        markdown = final_state.get("final_trade_decision") or str(final_state)
        return {"ticker": body.ticker, "date": trade_date, "rating": rating, "markdown": markdown}
    except Exception as exc:
        return {"error": str(exc), "ticker": body.ticker}

"""TradingAgents FastAPI sidecar for WallPilot Pro Agent Desk."""
from __future__ import annotations

import os
from datetime import date

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="WallPilot TradingAgents Sidecar")


class PropagateRequest(BaseModel):
    ticker: str
    date: str | None = None
    analysts: list[str] | None = None


def _build_config() -> dict:
    from tradingagents.default_config import DEFAULT_CONFIG

    cfg = {**DEFAULT_CONFIG}
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    openai_key = os.getenv("OPENAI_API_KEY")

    if gemini_key:
        os.environ.setdefault("GOOGLE_API_KEY", gemini_key)
        cfg["llm_provider"] = "google"
        cfg["deep_think_llm"] = os.getenv("TRADINGAGENTS_DEEP_MODEL", "gemini-2.0-flash")
        cfg["quick_think_llm"] = os.getenv("TRADINGAGENTS_QUICK_MODEL", "gemini-2.0-flash")
    elif openai_key:
        cfg["llm_provider"] = "openai"
        cfg["deep_think_llm"] = os.getenv("TRADINGAGENTS_DEEP_MODEL", "gpt-4o-mini")
        cfg["quick_think_llm"] = os.getenv("TRADINGAGENTS_QUICK_MODEL", "gpt-4o-mini")

    cfg["max_debate_rounds"] = int(os.getenv("TRADINGAGENTS_MAX_DEBATE_ROUNDS", "1"))
    cfg["max_risk_discuss_rounds"] = int(os.getenv("TRADINGAGENTS_MAX_RISK_ROUNDS", "1"))
    return cfg


def _render_markdown(final_state: dict) -> str:
    parts = [
        f"# {final_state.get('company_of_interest', 'Ticker')} — TradingAgents Report",
        "",
        "## Market Analyst",
        final_state.get("market_report") or "(no market report)",
        "",
        "## Fundamentals Analyst",
        final_state.get("fundamentals_report") or "(no fundamentals report)",
        "",
        "## News Analyst",
        final_state.get("news_report") or "(no news report)",
        "",
        "## Sentiment Analyst",
        final_state.get("sentiment_report") or "(no sentiment report)",
        "",
        "## Trader Plan",
        final_state.get("trader_investment_plan") or final_state.get("investment_plan") or "",
        "",
        "## Portfolio Manager Decision",
        final_state.get("final_trade_decision") or "",
    ]
    return "\n".join(p for p in parts if p is not None)


@app.get("/health")
def health():
    return {"status": "ok", "service": "tradingagents-api"}


@app.post("/propagate")
def propagate(body: PropagateRequest):
    try:
        from tradingagents.graph.trading_graph import TradingAgentsGraph

        trade_date = body.date or date.today().isoformat()
        graph = TradingAgentsGraph(config=_build_config())
        final_state, rating = graph.propagate(body.ticker, trade_date)
        markdown = _render_markdown(final_state)
        if not markdown.strip():
            raise HTTPException(status_code=502, detail="empty_tradingagents_output")
        return {
            "ticker": body.ticker,
            "date": trade_date,
            "rating": rating,
            "markdown": markdown,
        }
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

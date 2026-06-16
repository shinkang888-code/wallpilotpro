"""DartLab FastAPI sidecar for WallPilot Pro DARTLAB menu."""
from __future__ import annotations

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="WallPilot DartLab Sidecar")


class ContextRequest(BaseModel):
    stock_code: str


@app.get("/health")
def health():
    return {"status": "ok", "service": "dartlab-api"}


@app.post("/context")
def build_context(body: ContextRequest):
    try:
        from dartlab import Company
        from dartlab.engines.ai.context import build_compact_context

        code = body.stock_code.strip().zfill(6)
        company = Company(code)
        markdown = build_compact_context(company)
        return {
            "stock_code": code,
            "corp_name": company.corpName,
            "markdown": markdown,
        }
    except ImportError as exc:
        raise HTTPException(status_code=501, detail="dartlab_not_installed") from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

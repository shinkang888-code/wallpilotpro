# TradingAgents 기능 분석 보고서

> WallPilot Pro 통합 기준 · upstream: [TauricResearch/TradingAgents](https://github.com/TauricResearch/TradingAgents)

## 1. 요약

TradingAgents는 **실제 트레이딩 펌을 모방한 다중 LLM 에이전트 연구 프레임워크**입니다.
LangGraph 기반으로 티커·분석일을 입력하면 **4종 애널리스트 → Bull/Bear 토론 → Trader → Risk → Portfolio Manager** 순으로
5단계 등급(Buy ~ Sell)과 리포트를 산출합니다.

**실거래 봇이 아니며**, 투자 수익을 보장하지 않습니다.

## 2. WallPilot Pro 통합

| 항목 | 내용 |
|------|------|
| 메뉴 | **Agent Desk** — `/agents/desk` (Premium+) |
| Sidecar | `services/tradingagents-api` → `POST /propagate` |
| Vercel env | `TRADINGAGENTS_SERVICE_URL` |
| 폴백 | TypeScript 파이프라인 (`wallpilot-ts`) |
| UI | 설정 패널, 엔진 Auto/Sidecar/TS, 구조화 탭 |

### 데이터 흐름

```
사용자 → /agents/desk
           ├─ (병렬) Python sidecar propagate  ← TRADINGAGENTS_SERVICE_URL
           └─ (병렬) TS pipeline (analysts, debate, trader, risk, PM)
           → EN/KO 리포트 + 5-tier rating
```

## 3. upstream vs WallPilot

| | upstream | WallPilot |
|---|----------|-----------|
| 실행 | CLI / Docker / Python | Vercel + 선택 sidecar |
| LLM | 10+ 제공자 | Gemini (My API / Vercel) |
| Memory | `trading_memory.md` | `decision_log` (부분) |
| 실거래 | 시뮬레이션만 | Toss는 별도 Elite |

## 4. 전체 기능 활성화

1. Sidecar 배포 — [`TRADINGAGENTS_SIDECAR_DEPLOY.md`](./TRADINGAGENTS_SIDECAR_DEPLOY.md)
2. Vercel: `TRADINGAGENTS_SERVICE_URL=https://your-sidecar`
3. Sidecar: `GEMINI_API_KEY` 또는 `OPENAI_API_KEY`
4. (선택) `TRADINGAGENTS_MAX_DEBATE_ROUNDS`, `TRADINGAGENTS_DEEP_MODEL`

## 5. 참고

- 논문: [arXiv 2412.20138](https://arxiv.org/abs/2412.20138)
- 라이선스: Apache-2.0
- 확장 명세: [`WALLPILOTPRO_EXPANSION_SPEC.md`](./WALLPILOTPRO_EXPANSION_SPEC.md) §3.1

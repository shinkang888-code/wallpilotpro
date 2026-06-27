# WallPilot Pro — B2B 제휴 1페이지 제안서

> **제안 주체:** Terrabridge Capital Inc.  
> **제품:** WallPilot Pro Quant Analytics Engine  
> **연락:** terrabridgecapital@gmail.com · 발명·기술: kangjunchul8@gmail.com  
> **버전:** 1.0 · 2026-06-27

---

## 1. Executive Summary

WallPilot Pro는 **월스트리트 Reverse-Quant 방식**을 개인·기관 채널에 제공하는 **데이터·AI 주식 분석 엔진**입니다.  
증권사 MTS 보조탭, 리서치 채널, 로보어드바이저, 교육 플랫폼에 **API·화이트라벨·공동브랜드** 형태로 탑재할 수 있습니다.

**핵심 가치:** 거래량·수급·재무·뉴스 → **적정가·관심 구간·리스크 시나리오** (투자 참고 정보)

---

## 2. 제휴 대상 & Use Case

| 파트너 유형 | 탑재 형태 | 제공 가치 |
|-------------|-----------|-----------|
| **증권사 / MTS·HTS** | iframe·API 위젯 | “수급·적정가 레이어” — 체결 전 참고 분석 |
| **리서치 유튜브·텔레그램** | API + 브랜드 co-mark | 종목 리포트 자동 생성 · PDF · 시그널 피드 |
| **로보어드바이저·핀테크** | REST/Server Fn 연동 | 스크리닝·리밸런싱 후보 · Bull/Bear AI 요약 |
| **투자 교육·커뮤니티** | 화이트라벨 SaaS | 수강생 실습 도구 · 등급별 라이선스 |
| **미국 RIA / 리테일 브로커** | 13F·US universe API | KR-US 크로스마켓 스캔 |

---

## 3. 기술 스택 (Partner 관점)

```
┌─────────────────────────────────────────────────┐
│  Partner App (MTS / Web / Bot)                  │
└────────────────────┬────────────────────────────┘
                     │ HTTPS API
┌────────────────────▼────────────────────────────┐
│  WallPilot Engine (Terrabridge IP)              │
│  · Reverse-Quant Screener                       │
│  · Supply/Demand (외국인·기관)                  │
│  · Lynch / Greenblatt Valuation                 │
│  · AI Report (Gemini) · Agent Desk pipeline   │
│  · DART (KR) · 13F / market data (US)          │
└────────────────────┬────────────────────────────┘
                     │
         Supabase · Stripe · Vercel (호스팅)
```

- **배포:** Vercel SaaS 또는 Partner VPC sidecar (협의)
- **인증:** OAuth2 / API Key / Partner SSO (협의)
- **SLA:** 99.5% uptime target (Enterprise tier)

---

## 4. API 예시 (개념 — 실제 스펙은 NDA 후 제공)

| Endpoint | 설명 | Latency 목표 |
|----------|------|--------------|
| `POST /scan` | 유니버스 스크리닝 (퀀트·거래량·13F 토글) | < 5s |
| `GET /report/{ticker}` | 월가 리포트 (적정가·Buying Zone·수급) | < 8s |
| `POST /ai-pilot/chat` | 종목 Q&A (Premium tier) | < 15s |
| `GET /supply/{ticker}` | 외국인·기관 수급 스냅샷 | < 3s |
| `GET /dart/{code}` | DART 재무·공시 brief (KR) | < 10s |

**Rate limit:** Starter 1K/day · Growth 10K/day · Enterprise custom

---

## 5. 라이선스 모델 (제안)

| Tier | 월 라이선스 (USD) | 포함 |
|------|-------------------|------|
| **Starter** | $2,500 | API 1K calls/day · 1 brand · email support |
| **Growth** | $8,000 | 10K calls/day · co-brand · SLA 99.5% |
| **Enterprise** | $25,000+ | unlimited* · white-label · dedicated · on-prem option |

\* Fair use · burst 협의

**Revenue Share (대안):** Partner가 End-user 구독 판매 시 **Net Revenue 20~30%** to Terrabridge

**일회성:** 화이트라벨 구축 $15K~$50K (범위·채널 수에 따라)

---

## 6. 규제·컴플라이언스 (Partner 공동 책임)

| 항목 | WallPilot 입장 | Partner 권장 |
|------|----------------|--------------|
| 투자자문/일임 | **해당 없음** — 분석 API 제공 | Partner license에 맞게 disclosure |
| KR | 정보 제공 도구 · 권유 아님 명시 | 금융투자업법상 광고·권유 규정 준수 |
| US | Not RIA · Not investment advice | Partner compliance review |
| AI 출력 | “참고용·교차검증 필수” watermark | Partner ToS에 반영 |
| 데이터 | OpenDART·증권사 API·third-party TOS 준수 | Partner data agreement |

**공동 면책 문구** 템플릿은 `01_LANDING_COPY.md` Footer 참조.

---

## 7. IP·보안

- **소유권:** Terrabridge Capital Inc. — 알고리즘·UI·API design 전부
- **무단 클론 방지:** IP Shield · violation logging · proprietary license
- **데이터:** End-user API key(토스 등)는 Partner/사용자 로컬 — WallPilot 서버 비저장 원칙
- **NDA:** 기술 스펙·로드맵 공유 전 Mutual NDA 권장

---

## 8. PoC 제안 (8주 파일럿)

| Week | Deliverable |
|------|-------------|
| 1–2 | API key · sandbox · 10 ticker demo |
| 3–4 | Partner UI embed (1 screen) |
| 5–6 | 50 beta users · feedback |
| 7–8 | KPI review · commercial term sheet |

**PoC 비용 (제안):** $5,000 flat 또는 Growth tier 1개월 무료 (상호 협의)

**성공 KPI 예시:**
- DAU embed open rate > 15%
- Report generation > 3/user/week
- Partner NPS > 40

---

## 9. 경쟁 비교 (한 줄)

| | TradingView | 토스 종목분석 | WallPilot B2B |
|--|-------------|---------------|---------------|
| 수급·13F·퀀트 스크린 | △ | △ | ◎ |
| AI multi-agent report | × | △ | ◎ |
| API white-label | △ | × | ◎ |
| KR DART + US cross | × | KR only | ◎ |

---

## 10. Next Steps

1. **30분 discovery call** — 채널·규제·API volume
2. **NDA + sandbox API key**
3. **PoC SOW 서명**
4. **Commercial term sheet**

**Contact**  
Terrabridge Capital Inc.  
terrabridgecapital@gmail.com  
WallPilot Pro — https://wallpilot.vercel.app (production URL 협의)

---

*다음 문서: `03_GTM_90DAY_REVENUE_SCENARIO.md`*

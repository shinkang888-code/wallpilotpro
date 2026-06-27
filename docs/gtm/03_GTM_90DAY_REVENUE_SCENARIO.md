# WallPilot Pro — 90일 GTM & 월 매출 시나리오

> 버전 1.0 · 2026-06-27 · Terrabridge Capital Inc.  
> 가격 기준: Day ₩39K · Premium ₩99K · Elite ₩199K (KR) / $29·$59·$99 (US)

---

## 1. 목표 정의 (90일)

| 목표 | 보수 | 기준 | 낙관 |
|------|------|------|------|
| Free 가입 | 300 | 800 | 2,000 |
| 유료 전환 | 30 | 80 | 200 |
| MRR (KR+US 합산) | ₩1.5M | ₩4.5M | ₩12M |
| B2B PoC | 0 | 1 | 2 |

**North Star Metric:** 유료 회원 **주간 Active Scan 2회+** (리텐션 선행 지표)

---

## 2. 90일 타임라인

### Phase 1 — Week 1~2: 포지셔닝 & 랜딩

| Task | Owner | 산출물 |
|------|-------|--------|
| 랜딩 카피 반영 | Product | `01_LANDING_COPY.md` → `/` hero |
| 면책·Terms 페이지 | Legal | Footer + `/terms` (신규) |
| SEO meta 적용 | Dev | `__root.tsx` head |
| Google Analytics / Vercel Analytics | Dev | 전환 funnel |

**Exit criteria:** 랜딩 CTA → Google 가입 conversion 측정 시작

---

### Phase 2 — Week 3~4: Free → Day Trading 퍼널

| Task | 채널 |
|------|------|
| “오늘의 Reverse-Quant 3종목” 주 3회 SNS | X · 스레드 · 유튜브 쇼츠 |
| 스캐너 미리보기 → **가입 유도** in-app banner | Product |
| 단타 커뮤니티 2곳 소개글 (가치만, 광고 금지) | 네이버 카페 · 텔레 |
| 7일 Day Trading **₩9,900 체험** (선택) | Stripe coupon |

**Exit criteria:** Free 200+ · Day 전환 15+

---

### Phase 3 — Week 5~8: Premium 업셀 & 신뢰

| Task | 내용 |
|------|------|
| **적중 사례 5건** PDF/블로그 | “스캔 → N일 후 수익률” (면책 포함) |
| AI Pilot 데모 영상 3분 | YouTube · 랜딩 embed |
| Premium 14일 trial | in-app upgrade |
| DARTLAB KR 마케팅 | “재무제표 AI brief” 키워드 |

**Exit criteria:** Premium 20+ · churn < 12%/mo

---

### Phase 4 — Week 9~12: B2B + US

| Task | 내용 |
|------|------|
| B2B 제안서 발송 10곳 | `02_B2B_PARTNERSHIP_PROPOSAL.md` |
| PoC 1건 목표 | 리서치 채널 or 핀테크 |
| US Stripe EN landing A/B | Hero EN variant |
| Elite 토스 실행 **클로즈드 베타** 10명 | 1:1 온보딩 |

**Exit criteria:** B2B pipeline 3 active · US paid 10+

---

## 3. 채널별 CAC 가정 (KR)

| 채널 | CAC (₩) | 비고 |
|------|---------|------|
| Organic SNS | 0~5K | 시간 투자 |
| 유튜브 협찬 | 30~80K | 구독 1K 기준 |
| 네이버 검색 광고 | 50~120K | “주식 수급 분석” |
| 커뮤니티 바이럴 | 10~30K | 콘텐츠 품질 의존 |

**목표 blended CAC:** ₩40K 이하 (Day ARPU ₩39K → 2개월 LTV 회수)

---

## 4. 월 매출 시나리오 (MRR)

### 가정

- **Tier mix (유료 중):** Day 60% · Premium 30% · Elite 10%
- **Blended ARPU (KR):** 0.6×39 + 0.3×99 + 0.1×199 = **₩56.2K/월**
- **US share:** Month 1–2: 10% · Month 3: 20% (USD ARPU ~$45 blended)
- **Churn:** 보수 15% · 기준 10% · 낙관 7%/월
- **FX:** $1 = ₩1,350 (단순화)

### Month 3 End — Paid Subscribers

| | 보수 | 기준 | 낙관 |
|--|------|------|------|
| Paid (end) | 30 | 80 | 200 |
| KR paid | 27 | 64 | 160 |
| US paid | 3 | 16 | 40 |

### MRR Calculation (Month 3)

**KR MRR** = paid_kr × ₩56,200  
**US MRR** = paid_us × $45 × 1,350 ≈ paid_us × ₩60,750  

| Scenario | KR MRR | US MRR | **Total MRR** | **ARR run-rate** |
|----------|--------|--------|---------------|------------------|
| 보수 | ₩1.52M | ₩0.18M | **₩1.70M** | ₩20M |
| 기준 | ₩3.60M | ₩0.97M | **₩4.57M** | ₩55M |
| 낙관 | ₩8.99M | ₩2.43M | **₩11.4M** | ₩137M |

### B2B additive (Month 3, optional)

| | 기준 | 낙관 |
|--|------|------|
| PoC 1 × $5K one-time | +₩675K (one-off) | |
| Growth license 1 × $8K/mo | — | +₩10.8M MRR |

---

## 5. 90일 P&L 스케치 (기준 시나리오)

| 항목 | Month 1 | Month 2 | Month 3 |
|------|---------|---------|---------|
| MRR | ₩0.8M | ₩2.5M | ₩4.6M |
| 마케팅 spend | ₩1.0M | ₩1.5M | ₩2.0M |
| Infra (Vercel·Supabase·AI) | ₩0.3M | ₩0.4M | ₩0.5M |
| **Net (rough)** | **-₩0.5M** | **+₩0.6M** | **+₩2.1M** |

*Founder salary·법무 미포함*

---

## 6. 주간 KPI 대시board

| KPI | Week 목표 (기준) |
|-----|------------------|
| Free signups | +50/week (후반 +80) |
| Free → Paid CR | 8~12% |
| WAU / Paid | > 70% |
| Scan per paid user | ≥ 2/week |
| Upgrade Day→Premium | 15% of Day base |
| Support tickets | < 5% of WAU |
| IP violation logs | monitor only |

---

## 7. 리스크 & 대응

| 리스크 | 대응 |
|--------|------|
| 투자자문 규제 | “참고 정보” copy · Terms · AI disclaimer |
| AI hallucination | 재무 수치 DART/ API cross-check UI |
| 높은 churn | Weekly “3 picks” email · scan habit |
| CAC > ARPU | Organic·B2B2C shift · trial coupon |
| 토스 API 변경 | Elite tier communication · bridge abstraction |

---

## 8. 90일 후 분기 목표 (Day 91~180 preview)

- Paid **250+** (기준) · MRR **₩12M+**
- B2B **1 Enterprise** or **3 Growth**
- US revenue **30%+**
- Terms · Privacy · KR 금융광고 self-review 완료
- 상표 WallPilot™ US filing 검토

---

## 9. 즉시 실행 체크리스트 (이번 주)

- [x] `01_LANDING_COPY.md` Hero를 `/` 또는 마케팅 페이지에 반영 → `src/components/marketing/*`
- [x] Terms / Privacy 페이지 초안 게시 → `/terms` · `/privacy`
- [ ] Stripe/Danal 결제 테스트 (Day tier) — `/pricing`에서 수동 1회 (운영 키 필요)
- [ ] Supabase `ip_violation_log` migration push — `supabase login` 후 `npm run supabase:db:push`
- [x] SNS 계정 1개 · 주 3포스트 캘린더 → `05_SNS_CONTENT_CALENDAR_W1.md`
- [x] B2B 타겟 리스트 10곳 · cold email draft → `04_B2B_COLD_EMAIL_TARGETS.md`
- [x] SEO meta · Vercel Analytics → `__root.tsx` · `SiteAnalytics`
- [x] Production build · Vercel deploy (2026-06-27)

---

## 10. 문서 인덱스

| # | 파일 | 용도 |
|---|------|------|
| 1 | `01_LANDING_COPY.md` | B2C 랜딩·광고·면책 |
| 2 | `02_B2B_PARTNERSHIP_PROPOSAL.md` | 증권·리서치·핀테크 제휴 |
| 3 | `03_GTM_90DAY_REVENUE_SCENARIO.md` | 실행·KPI·매출 (본 문서) |
| 4 | `04_B2B_COLD_EMAIL_TARGETS.md` | B2B 타겟 10 · cold email |
| 5 | `05_SNS_CONTENT_CALENDAR_W1.md` | Week 1~2 SNS 캘린더 |

---

**Owner:** Terrabridge Capital Inc. · kangjunchul8@gmail.com (Product) · terrabridgecapital@gmail.com (Business)

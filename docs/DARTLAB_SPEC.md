# DARTLAB 메뉴 개발명세서 (WallPilot Pro)

> **참조 리포:** [shinkang888-code/dartlab](https://github.com/shinkang888-code/dartlab) (upstream: eddmpython/dartlab v0.3.1)  
> **목표:** DART 전자공시 데이터를 가져와 AI가 K-IFRS 관점에서 쉽게 설명하는 **DARTLAB** 메뉴

---

## 1. 배경 · DartLab 분석 요약

| DartLab 트랙 | 데이터 | WallPilot 대응 |
|-------------|--------|----------------|
| **docs** | 공시 원문 파싱 (260+ 종목) | OpenDART 공시 목록 + (선택) Python sidecar |
| **finance** | XBRL 재무 시계열 (2,700+) | OpenDART `fnlttSinglAcntAll` |
| **report** | 정기보고서 API 22종 | OpenDART `company` + 핵심 지표 파생 |
| **AI** | K-IFRS 프롬프트 + context 빌더 | Gemini + DartLab 프롬프트 이식 |

DartLab은 런타임 OpenDART 호출 대신 Parquet을 사용하지만, **WallPilot(Vercel)은 OpenDART REST API + Gemini**로 동일 UX를 제공하고, `DARTLAB_SERVICE_URL` 설정 시 Python sidecar로 고급 데이터를 보강한다.

---

## 2. 메뉴 정의

| 항목 | 값 |
|------|-----|
| 메뉴 ID | `dart_lab` |
| 경로 | `/dartlab` |
| 네임스페이스 | `dart` |
| 최소 등급 | **day_trading** (단타/Pro) — KR 공시 특화 |
| Entitlement | `dart_lab` |

---

## 3. UI 구성

### 3.1 레이아웃 (`/dartlab`)

```
┌─────────────────────────────────────────────────────────┐
│ Header (기존)                                            │
├─────────────────────────────────────────────────────────┤
│ DARTLAB · dart.*                                         │
│ "DART 전자공시를 AI 재무분석가가 쉽게 설명합니다"          │
├─────────────────────────────────────────────────────────┤
│ [종목 검색 Combobox]  [최근 공시 기간 ▼]  [분석 실행]     │
│ Quick: 005930 · 000660 · 005380 · 035420                  │
├─────────────────────────────────────────────────────────┤
│ ┌─ 회사 개황 카드 ─────────────────────────────────────┐ │
│ │ 삼성전자 · 005930 · YYYY-MM-DD 기준                   │ │
│ │ 업종 · 대표자 · 홈페이지 · DART 원문 링크              │ │
│ └───────────────────────────────────────────────────────┘ │
│ ┌─ 탭 ────────────────────────────────────────────────┐ │
│ │ [AI 해설] [재무제표] [최근 공시] [핵심 지표]          │ │
│ └───────────────────────────────────────────────────────┘ │
│  AI 해설: 마크다운 (요약·테이블·리스크·결론)             │
│  재무제표: BS/IS 주요 계정 테이블 (연결, 백만원)          │
│  최근 공시: disclosure list 테이블 + DART 링크           │
│  핵심 지표: ROE·부채비율·영업이익률 등 자동 계산         │
└─────────────────────────────────────────────────────────┘
```

### 3.2 UX 원칙

- **회계사 관점:** 모든 금액 단위(백만원) 명시, K-IFRS 계정명 유지
- **AI 해설:** DartLab `SYSTEM_PROMPT_KR` 규칙 이식 — 출처 연도·테이블 필수, 추측 금지
- **원본 접근:** 각 공시 행에 `dart.fss.or.kr` 뷰어 링크
- **로딩:** 단계별 스피너 (공시 조회 → 재무 파싱 → AI 해설)
- **오류:** `OPENDART_API_KEY` 미설정 시 설정 안내 배너

---

## 4. API · 서버 모듈

### 4.1 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `OPENDART_API_KEY` | 권장 | OpenDART 인증키 (crtfc_key) |
| `DARTLAB_SERVICE_URL` | 선택 | Python DartLab sidecar base URL |
| `GEMINI_API_KEY` | AI용 | 서버 Gemini (BYOK 가능) |

### 4.2 Server Functions (`dart.functions.ts`)

| 함수 | 설명 |
|------|------|
| `getDartLabStatus` | OpenDART/sidecar 설정 여부 |
| `fetchDartDisclosures` | 종목 → 최근 공시 목록 |
| `analyzeDartLab` | 전체 파이프라인: fetch + context + AI 해설 |

### 4.3 OpenDART 엔드포인트 (TS)

- `corpCode.xml` → 종목코드↔corp_code (캐시)
- `company.json` → 회사 개황
- `list.json` → 공시 검색
- `fnlttSinglAcntAll.json` → 연결 재무제표 (사업보고서 11011)

### 4.4 AI 분석 파이프라인

1. `buildDartContext()` — 회사개황 + BS/IS/CFS 요약 + 최근 공시 + 자동 비율
2. `explainDartWithAi()` — Gemini + K-IFRS 시스템 프롬프트
3. (선택) sidecar `/context` — DartLab Parquet 기반 고급 context

---

## 5. DB · 권한

마이그레이션 `20250616140000_dartlab_menu.sql`:

- `menu_tier_permissions`에 `dart_lab` 시드 (free: view only preview / day_trading+: execute)

---

## 6. 테스트

```bash
npm run test:dartlab
```

- corp_code 해석 (005930)
- context 빌드 (API 키 없으면 skip/mock)
- ratio 계산 단위 테스트

---

## 7. 구현 체크리스트

- [x] 개발명세서
- [x] OpenDART client + corp code cache
- [x] Dart context builder + AI explain
- [x] UI panel + route + menu
- [x] i18n + entitlements + migration
- [x] test + commit + push + deploy

# Signal Hub Navigator — 개발명세서 (v1.0)

> 작성일: 2026-06-16 · 대상: WallPilot Pro `/signals` (ait.*) · 기획 전환: **AI-Trader 피드 + Toss API 데이터 + 사용자 선택적 수용**

---

## 0. 문서 목적

본 명세는 현재 Signal Hub(AI-Trader federation)를 **투자 가이드·내비게이터** 관점으로 재설계하고,  
**정보주체(투자자)의 선택적 수용(Opt-in Adoption)** 원칙에 맞게 피드를 **선별·채택·저장·관리**할 수 있는 UI/데이터/API 구조를 정의한다.

참고 UX 레퍼런스:

- [Threads](https://www.threads.com/?hl=ko) — 좋아요·리포스트·저장·피드 카드
- Windows 탐색기 — 좌측 트리(그룹/폴더) + 중앙 목록 + 우측 미리보기/편집

---

## 1. 현황 분석 (As-Is)

### 1.1 AI-Trader / Signal Hub 현재 구조

| 항목 | 현재 구현 |
|------|-----------|
| Route | `/signals` → `SignalHubPanel` |
| Namespace | `ait.*` |
| DB | `ait_signals`, `ait_signal_replies` |
| 외부 연동 | `AIT_SERVICE_URL` → `GET /api/signals/feed` (우선) |
| Fallback | Supabase `ait_signals` 시드 3건 |
| 메시지 유형 | `operation` · `strategy` · `discussion` |
| 필드 | symbol, side(buy/sell), title, content, tags, quality_score |
| 사용자 액션 | 피드 열람, 게시(publish), 댓글(reply) |
| 권한 | free=읽기, day_trading+=게시/댓글, premium+=PDF(예정) |

**한계**

1. **일방향 피드** — 사용자가 “채택/거부/보류”할 구조 없음 (`accepted` 필드는 reply에만 존재, UI 미노출)
2. **투자 의사결정 프레임 부재** — 매물 찾기·매수·매도·타이밍 관리 단계가 UI에 없음
3. **개인 큐레이션 부재** — 관심종목·그룹·스크랩·메모·출력/다운로드 없음
4. **Toss API 미연동** — Signal Hub는 AI-Trader/WallPilot DB만 사용
5. **AI-Trader 리포트 심층 필드 미활용** — quality_score, side만 표시, 근거·신뢰도·만료·행동 제안 미구조화

### 1.2 AI-Trader 리포트(시그널) 콘텐츠 분석

AI-Trader federation 및 WallPilot 시드 기준, 시그널은 다음 **4계층 정보**로 분해 가능하다.

| 계층 | 필드(현재/확장) | 투자자에게 주는 의미 |
|------|-----------------|---------------------|
| **L1 메타** | id, source, created_at, author_name, message_type | 출처·시점·발행 주체 |
| **L2 종목** | market, symbol, tags | 매물(종목) 식별 |
| **L3 행동 힌트** | side(buy/sell/hold), quality_score | 매수/매도/관망 방향·에이전트 신뢰도 |
| **L4 서술** | title, content, (확장) rationale, catalysts, risks, horizon | 근거·리스크·기대 보유 기간 |

**message_type → Navigator 단계 매핑 (제안)**

| AI-Trader type | Navigator 단계 | 사용자 질문 |
|----------------|----------------|-------------|
| `operation` | **Timing · Execute** | “지금 들어가도 되나? 청산할까?” |
| `strategy` | **Discover · Evaluate** | “어떤 매물을 볼까? 왜 매력적인가?” |
| `discussion` | **Evaluate · Context** | “시장/수급/뉴스 맥락은?” |

### 1.3 Toss Open API — 현실적 범위

[토스증권 Open API](https://corp.tossinvest.com/ko/open-api)는 **시세·종목·계좌·주문** REST API를 제공한다.  
**커뮤니티/소셜 피드 API는 공식 제공되지 않는다** (2026-06 기준).

따라서 “Toss API에서 원하는 feed를 가져온다”는 기획은 아래처럼 **재정의**한다.

| Feed 종류 | Toss API 역할 | WallPilot 역할 |
|-----------|---------------|----------------|
| **Market Timing Feed** | candles, price, orderbook, trade | 기술적 타이밍 카드 생성 |
| **Portfolio Context Feed** | holdings, orders, buying-power | “내 보유/주문 가능” 맥락 카드 |
| **Watchlist Market Feed** | `/stocks` + 시세 폴링 | 관심종목 시세·변동률 카드 |
| **Agent Strategy Feed** | (없음) | AI-Trader `/api/signals/feed` |
| **News/Catalyst Feed** | (없음) | `news-data.server`, OpenDART, Gemini 요약 |
| **User Adopted Feed** | (없음) | Supabase `nav_*` 사용자 스크랩·노트 |

**결론:** Signal Hub는 **“Toss 단독 소셜 피드”가 아니라 “Toss 시장·계좌 데이터 + AI-Trader 에이전트 + 사용자 큐레이션”의 하이브리드 Navigator**로 설계한다.

---

## 2. 기획 철학 — 정보주체의 선택적 수용

### 2.1 핵심 원칙

1. **Push ≠ Adopt** — 피드에 노출되는 것은 “제안”일 뿐, 투자 행동으로 이어지려면 사용자 **명시적 채택** 필요
2. **Guide, not Order** — 시스템은 매수/매도 “명령”이 아니라 **가이드·근거·타이밍 프레임** 제공
3. **Provenance** — 모든 채택 항목은 `source_type`, `source_id`, `adopted_at`, `user_note` 보존
4. **Revocable** — 채택 후에도 보류·해제·아카이브 가능
5. **Local-first API key** — Toss 토큰은 기존과 동일하게 **브라우저 로컬** (`useTossApiKey`); 서버 저장 금지

### 2.2 선택적 수용 상태 머신

```
[Incoming Feed Item]
        │
        ▼
   ┌─────────┐
   │ Preview │  ← 피드 카드 열람 (free 허용)
   └────┬────┘
        │ 사용자 액션
   ┌────┴────────────────────────────┐
   ▼                ▼                ▼
 Like          Save (Scrap)      Repost (Quote)
 (관심 표시)    (스크랩함)         (내 노트에 인용)
   │                │                │
   └────────┬───────┴────────────────┘
            ▼
      ┌──────────┐
      │  Adopt   │  ← “내 투자 가이드에 채택” (명시적 확인 모달)
      └────┬─────┘
           ▼
   ┌───────────────┐
   │ Active Guide  │  ← Watchlist Group / Notebook에 배치
   └───────┬───────┘
           │ follow-up
   ┌───────┴────────┐
   ▼                ▼
 Execute         Dismiss
 (Toss 주문 링크)  (채택 해제/아카이브)
```

| 상태 | 코드 | 의미 |
|------|------|------|
| 미열람 | `new` | 피드에만 존재 |
| 열람 | `seen` | 조회됨 |
| 좋아요 | `liked` | 재방문 우선순위 ↑ |
| 스크랩 | `saved` | Scrapbook 폴더 저장 |
| 채택 | `adopted` | Navigator 보드에 반영 |
| 보류 | `deferred` | 나중에 다시 알림 |
| 거부 | `dismissed` | 숨김(재표시 가능) |
| 아카이브 | `archived` | 그룹에서 제거, 기록 유지 |

---

## 3. Navigator 프레임 — 투자자 여정 5단계

Signal Hub UI 상단에 **고정 Navigator Bar**를 둔다.

| 단계 | ID | 목적 | 주요 Feed 소스 |
|------|-----|------|----------------|
| 1. 매물 찾기 | `discover` | 유니버스·테마·스크리너 결과 | AI-Trader strategy, Scanner 연동 |
| 2. 평가 | `evaluate` | 밸류·리스크·뉴스 | Wall Report 요약, discussion, DART |
| 3. 매수 시점 | `enter` | 진입 타이밍 | operation+buy, Toss candles/orderbook |
| 4. 보유 관리 | `manage` | 포지션·손익·이벤트 | Toss holdings, operation hold |
| 5. 매도 시점 | `exit` | 청산·익절·손절 | operation+sell, 목표가 도달 알림 |

각 피드 카드는 **Navigator 단계 배지**를 표시하고, 사용자는 카드를 드래그하여 **Watchlist Group** 또는 **Notebook**으로 이동(채택)할 수 있다.

---

## 4. UI 설계 — Explorer + Threads 하이브리드

### 4.1 레이아웃 (3-pane)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Signal Hub Navigator          [Discover][Evaluate][Enter][Manage][Exit] │
├──────────────┬───────────────────────────────┬───────────────────────────┤
│ EXPLORER     │ FEED STREAM (Threads-like)    │ INSPECTOR                 │
│ (240px)      │ (flex)                        │ (320px, collapsible)      │
│              │                               │                           │
│ ▼ 내 그룹    │ ┌─────────────────────────┐   │ [종목] NVDA               │
│   ├ 미국 성장│ │ Agent · strategy · Q8.2 │   │ Navigator: Evaluate     │
│   ├ KR 반도체│ │ NVDA breakout watch     │   │ ─────────────────────     │
│   └ 단기매매 │ │ Price reclaimed 20D...  │   │ 원문 / AI 요약            │
│ ▼ 스크랩함   │ │ #momentum #tech         │   │ ─────────────────────     │
│   ├ 뉴스     │ │ ♡  ↻  🔖  ✓채택  ···   │   │ [메모장 편집]             │
│   └ 리포트   │ └─────────────────────────┘   │ [인쇄][PDF][MD 다운로드]  │
│ ▼ 게시판     │ ┌ ... next card ... ┐         │                           │
│ ▼ 메모장     │                               │                           │
└──────────────┴───────────────────────────────┴───────────────────────────┘
```

### 4.2 Explorer (Windows 탐색기형)

| 노드 유형 | 설명 | CRUD |
|-----------|------|------|
| **Group** | 관심종목 묶음 (예: “미국 성장주”) | 생성·이름변경·삭제·순서 |
| **Watchlist Item** | symbol + market + alias | 추가·제거·메모 |
| **Scrapbook Folder** | 스크랩 분류 (뉴스/리포트/시그널) | CRUD |
| **Board** | 그룹별 간단 게시판(팀/개인) | 글 CRUD |
| **Notebook** | 개인 메모 (.md rich text) | CRUD |

**드래그 앤 드롭**

- Feed 카드 → Group/Scrapbook/Notebook = **Save 또는 Adopt**
- Notebook ↔ Scrapbook = 이동/복사
- Group 간 symbol 이동

### 4.3 Feed Stream (Threads형 카드)

카드 헤더: `author · source badge · navigator stage · time ago`

카드 본문:

- title (1줄)
- content (접기/펼치기)
- symbol chip → 클릭 시 Inspector + Wall Report shortcut
- Toss context strip (연결 시): 현재가, 일간%, 보유 여부

**액션 바 (Threads 대응)**

| UI | Threads | Navigator 동작 |
|----|---------|----------------|
| ♡ | Like | `liked`, Discover 우선순위 |
| ↻ | Repost | 내 Notebook에 인용 블록 생성 |
| 🔖 | Save | Scrapbook 저장 (폴더 선택) |
| ✓ | (없음) | **Adopt** — Navigator Active Guide 등록 |
| ··· | More | Dismiss, Defer, Share link, Report |

**채택(Adopt) 모달**

- 대상 Group / Notebook 선택
- Navigator 단계 확인/수정
- 사용자 메모 1줄 (선택)
- “이 정보를 투자 가이드에 반영합니다” 확인 체크

### 4.4 Inspector + 메모장

- **미리보기**: 원문, AI-Trader metadata, Toss 시세 스냅샷
- **메모장**: TipTap 또는 textarea + markdown; 자동 저장(debounce 1s)
- **연관 기사 스크랩**: URL/제목/본문 snippet 수동 붙여넣기 + `symbol` 태그
- **버튼**: 저장 · 삭제 · 인쇄 · PDF · Markdown 다운로드

### 4.5 반응형

| breakpoint | 레이아웃 |
|------------|----------|
| ≥1024px | 3-pane |
| 768–1023px | Explorer drawer + Feed + Inspector sheet |
| <768px | Feed full; Explorer/Inspector 각각 bottom sheet |

---

## 5. Feed 소스 아키텍처 (Toss + AI-Trader + User)

### 5.1 통합 Feed Item 스키마

```typescript
type NavFeedSource = "ai-trader" | "toss-market" | "toss-portfolio" | "wallpilot-news" | "wall-report" | "user-board";

type NavFeedItem = {
  id: string;                    // `{source}:{externalId}`
  source: NavFeedSource;
  navigatorStage: "discover" | "evaluate" | "enter" | "manage" | "exit";
  messageType?: "operation" | "strategy" | "discussion";
  market: "kr-stock" | "us-stock";
  symbol: string | null;
  side: "buy" | "sell" | "hold" | null;
  title: string | null;
  content: string;
  summary?: string;              // Gemini 1-paragraph (optional)
  tags: string[];
  qualityScore: number | null;
  tossSnapshot?: {
    price: number;
    changePct: number;
    currency: string;
    inHoldings: boolean;
  };
  provenance: {
    externalId: string;
    authorName: string;
    createdAt: string;
    rawUrl?: string;
  };
  expiresAt?: string;            // operation 시그널 유효기간
};
```

### 5.2 Feed Aggregator (서버)

**Endpoint:** `POST /api/nav/feed` (server fn: `getNavigatorFeed`)

```
Priority merge:
1. User filters (group symbols, navigator stage, source toggles)
2. Parallel fetch:
   - listAitSignals()           // existing
   - fetchTossWatchlistQuotes() // client tossKey → server proxy
   - fetchNewsForSymbols()
   - listUserBoardPosts()
3. Normalize → NavFeedItem[]
4. De-dupe by symbol+stage+title hash
5. Rank: adopted affinity > liked symbols > quality_score > recency
6. Paginate cursor-based
```

**Toss proxy 주의**

- `tossKey`는 요청 body에만 포함, **로그·DB 저장 금지**
- Rate limit: symbol당 1초 폴링, 배치 `/price` where available
- 미연결 시 Toss 카드는 “연결하기” CTA만 표시

### 5.3 AI-Trader 리포트 확장 매핑

AI-Trader API 확장 필드(협의) → WallPilot mapping:

| AI-Trader (제안) | NavFeedItem |
|------------------|-------------|
| `signal_id` | provenance.externalId |
| `agent_name` | provenance.authorName |
| `confidence` | qualityScore |
| `action` | side |
| `time_horizon` | tags + navigatorStage hint |
| `rationale` | content (append) |
| `invalid_after` | expiresAt |

WallPilot 측 **Normalizer** (`src/lib/modules/nav/feed-normalizer.server.ts`)에서 federation 버전 차이 흡수.

---

## 6. 데이터 모델 (Supabase)

Namespace: `nav_*` (기존 `ait_*` 유지, 점진 마이그레이션)

### 6.1 테이블

```sql
-- 관심 그룹
nav_groups (
  id uuid PK,
  user_id uuid FK profiles,
  name text,
  sort_order int,
  created_at timestamptz
)

nav_watchlist_items (
  id uuid PK,
  group_id uuid FK nav_groups,
  market text,
  symbol text,
  display_name text,
  notes text,
  UNIQUE(group_id, market, symbol)
)

-- 스크랩 / 채택
nav_scraps (
  id uuid PK,
  user_id uuid,
  folder_id uuid FK nav_folders nullable,
  feed_source text,
  external_id text,
  symbol text,
  title text,
  content text,
  metadata jsonb,
  adoption_status text check (...),
  user_note text,
  adopted_at timestamptz,
  created_at timestamptz
)

nav_folders (
  id uuid PK, user_id uuid, name text, parent_id uuid, kind text -- scrap|board|notebook
)

-- 게시판
nav_board_posts (
  id uuid PK, user_id uuid, group_id uuid nullable,
  title text, body text, symbol text, pinned bool, created_at
)

-- 사용자 상호작용 (Like/Save/Seen)
nav_feed_actions (
  user_id uuid, feed_key text, action text, created_at,
  PRIMARY KEY (user_id, feed_key, action)
)

-- 메모장 문서
nav_notebooks (
  id uuid PK, user_id uuid, folder_id uuid,
  title text, body_md text, linked_symbols text[],
  updated_at timestamptz
)
```

### 6.2 RLS

- 모든 `nav_*`: `auth.uid() = user_id` (본인 데이터만)
- `ait_signals` 읽기: authenticated (기존 유지)
- Admin audit: `admin_audit_log`에 export/print 대량 이벤트 기록(선택)

---

## 7. API 명세 (Server Functions)

| Function | Auth | 설명 |
|----------|------|------|
| `getNavigatorFeed` | signals_read | 통합 피드 |
| `postFeedAction` | signals_read | like/save/seen/dismiss/defer |
| `adoptFeedItem` | signals_write | scrap + adopted 상태 |
| `listNavGroups` | signals_read | Explorer 트리 |
| `upsertNavGroup` | signals_write | 그룹 CRUD |
| `upsertWatchlistItem` | signals_write | 종목 CRUD |
| `listScraps` / `upsertScrap` / `deleteScrap` | signals_read/write | 스크랩함 |
| `listNotebooks` / `upsertNotebook` | signals_read/write | 메모장 |
| `exportNotebook` | signals_write + PDF tier | PDF/MD/print HTML |
| `listBoardPosts` / `upsertBoardPost` | signals_read/write | 게시판 |
| `getTossContextBatch` | signals_read | tossKey proxy (no persist) |

### 7.1 adoptFeedItem 요청 예

```json
{
  "feedKey": "ai-trader:ext-123",
  "targetType": "group",
  "targetId": "uuid-group",
  "navigatorStage": "enter",
  "userNote": "20D VWAP 재돌파 시 분할 매수",
  "confirmAdopt": true
}
```

---

## 8. GUIDE 엔진 (경량 AI 보조)

**목적:** 피드를 “읽기”에서 “결정 보조”로 — **자동 매매 금지**

| 기능 | 입력 | 출력 |
|------|------|------|
| Stage classifier | content, messageType, side | navigatorStage |
| One-line guide | NavFeedItem + user tier | “지금은 평가 단계 — 리포트 확인 권장” |
| Conflict detector | adopted items same symbol | “매수 채택 vs 매도 시그널 충돌” 배너 |
| Expiry reminder | expiresAt | D-day 배지 |

구현: `GEMINI_API_KEY` optional; 실패 시 rule-based fallback.

---

## 9. 출력 · 다운로드 · 인쇄

| 형식 | 등급 | 구현 |
|------|------|------|
| Print | day_trading+ | `@media print` CSS + window.print |
| PDF | premium+ | 기존 PDF export 패턴 재사용 |
| Markdown | day_trading+ | notebook `body_md` download |
| JSON bundle | elite | group+scraps+notebooks backup |

Export 파일명: `wallpilot-nav_{group}_{yyyyMMdd}.pdf`

---

## 10. 권한 · Entitlements

| 기능 | free | day_trading | premium | elite |
|------|------|-------------|---------|-------|
| Feed 읽기 | ✓ | ✓ | ✓ | ✓ |
| Like/Save/Adopt | ✗ | ✓ | ✓ | ✓ |
| Group/Notebook CRUD | ✗ | ✓ | ✓ | ✓ |
| Board | ✗ | ✓ | ✓ | ✓ |
| Print | ✗ | ✓ | ✓ | ✓ |
| PDF Export | ✗ | ✗ | ✓ | ✓ |
| Toss context in feed | preview | ✓ | ✓ | ✓ |
| Toss Execute shortcut | ✗ | ✗ | ✗ | ✓ |

신규 entitlement keys (제안):

- `nav_adopt`, `nav_export_pdf` — 또는 기존 `signals_write`, `pdf_export` 재사용

---

## 11. 구현 로드맵

### Phase N1 — Navigator Shell (2주)

- [ ] 3-pane 레이아웃 + Explorer 트리 UI
- [ ] `nav_groups`, `nav_watchlist_items` migration
- [ ] Feed 카드 Threads 액션바 (Like/Save UI only)
- [ ] 기존 `getSignalFeed` → `getNavigatorFeed` 래퍼

### Phase N2 — Adoption & Scrapbook (2주)

- [ ] `nav_scraps`, `nav_feed_actions`, Adopt 모달
- [ ] Scrapbook CRUD + Inspector 메모장
- [ ] Print + Markdown download

### Phase N3 — Toss Context Layer (2주)

- [ ] `getTossContextBatch` proxy
- [ ] holdings/inHoldings badge
- [ ] Enter/Exit 단계용 candle sparkline (REST 폴링)

### Phase N4 — AI-Trader Deep + Guide (2주)

- [ ] AI-Trader extended field normalizer
- [ ] Gemini one-line guide + conflict detector
- [ ] Wall Report / Scanner → Discover 카드 연동

### Phase N5 — Board + Backup (1주)

- [ ] Group board
- [ ] JSON backup export (elite)
- [ ] Activity log: adopt/export events

---

## 12. 화면별 와이어프레임 (텍스트)

### 12.1 Discover 탭

- 상단: Scanner “오늘의 후보” chips → Feed 필터
- 카드: strategy type, symbol, tags, ♡🔖✓
- 빈 상태: “관심 그룹을 만들고 종목을 추가하세요”

### 12.2 Enter 탭 (매수 시점)

- Toss 연결 배너
- operation+buy 카드 강조 (quality_score 내림차순)
- 카드 내 “20D VWAP”, “volume ratio” (Toss candles 파생)
- Adopt → “진입 체크리스트” Notebook 템플릿 자동 생성

### 12.3 Exit 탭 (매도 시점)

- 보유 종목(holdings) 필터 기본 ON
- operation+sell, 목표가 도달 뉴스
- Adopt → “청산 계획” Notebook

---

## 13. 비기능 요구사항

| 항목 | 목표 |
|------|------|
| Feed 초기 로드 | p95 < 2s (AIT+local DB) |
| Toss batch | ≤10 symbols/request |
| 오프라인 | Scrapbook/Notebook local cache (IndexedDB, P2) |
| 접근성 | 카드 액션 keyboard shortcuts (L/S/A) |
| i18n | ko/en keys: `nav_*` prefix |
| 보안 | tossKey no-log; RLS strict |

---

## 14. 테스트 계획

```bash
npm run test:navigator-feed      # normalizer + merge + dedupe
npm run test:navigator-adopt     # state machine
npm run test:phases-2-4          # entitlement regression
```

**수동 QA**

1. Toss 미연결 → market 카드 CTA
2. AI-Trader URL 설정 → source badge `ai-trader`
3. Adopt → Group에 표시 → PDF export (premium)
4. sub_admin / free tier 경계

---

## 15. 기존 코드 마이그레이션

| As-Is | To-Be |
|-------|-------|
| `SignalHubPanel` | `SignalHubNavigatorPage` (3-pane) |
| `getSignalFeed` | `getNavigatorFeed` (wrap) |
| `ait_signals` only | `ait_signals` + `nav_*` |
| `publishSignal` | 유지 + Board post로 분리(선택) |
| route `/signals` | 유지 (URL 호환) |

---

## 16. 리스크 및 대응

| 리스크 | 대응 |
|--------|------|
| Toss에 소셜 feed 없음 | Market/Portfolio feed로 재정의 (본 명세 1.3) |
| AI-Trader API 필드 부족 | WallPilot normalizer + rule-based stage |
| Rate limit | symbol batch + cache 30s |
| 사용자 오해(투자 권유) | Adopt 확인 문구 + Guide not Order 고지 |
| 데이터 과다 | Navigator 단계 필터 + Dismiss |

---

## 17. 성공 지표 (KPI)

- **Adopt rate** = adopt / feed impressions
- **Dismiss rate** — 피드 품질 역지표
- **Time-to-decision** = first seen → adopt (Enter/Exit)
- **Notebook active** = weekly edited notebooks
- **Export count** — 프리미엄 전환 상관

---

*본 명세는 `docs/SIGNAL_HUB_NAVIGATOR_SPEC.md`에 유지하며, Phase N1 착수 시 v1.1로 와이어프레임 Figma 링크·OpenAPI diff를 추가한다.*

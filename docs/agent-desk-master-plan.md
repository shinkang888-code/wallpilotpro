# Agent Desk 마스터 기획안 (Leaf 특허 기반)

## 1. 제품 목적
대표(CEO)가 **각 AI 직원에게 독립 워크스페이스(카톡방)** 를 부여하고, 부서별 역할·인격(헌법)에 맞는 업무 지시 → Gemini 답변 → **문서 아티팩트 영속화** → **일괄 보고**를 받는 AI 오피스.

## 2. 특허 명세서 핵심 매핑

| 특허 개념 | Agent Desk 구현 |
|-----------|-----------------|
| Guideline Constitution Rules | `constitution_role` + `constitution_prompt` + 부서 `mission` |
| Isolated Virtual Workspace Zones | 직원별 독립 채팅 스레드 + 빌딩 뷰 좌표(`workspace_x/y_pct`) |
| Stage Artifact Gate | 채팅/보고 응답 JSON 스키마 검증 (summary/body 필수) |
| Artifact Perpetuation | `office_reports` DB 저장 + Word/HWP/PPT/PDF/TXT 다운로드 |
| FSM Pipeline | CEO 지시 `CEO_INPUTED → RUNNING → WAITING_APPROVAL → COMPLETED` |
| Human-in-the-Loop | 일괄 지시 완료 후 CEO 승인 → 보고서 보관함 확정 |
| Asymmetric LLM Routing | 팀장=논리(OpenAI 우선), 리서치=창의(Gemini 우선) — Phase 4 |
| 3-Tier Priority | AgentRuntime > AniStudio 경로 > 정적 슬롯 (기존 building-scene) |

## 3. 인격어(Persona) 설계 모델
각 AI 직원은 4층 페르소나를 가진다.

1. **헌법 역할** (`constitution_role`): director / researcher / marketer / reviewer / operator
2. **직무 정의** (`description`): KR/US 리서치, 리스크 게이트 등
3. **인격어** (`vibe`): 말투·태도 (예: "데이터 기반 낙관적")
4. **헌법 프롬프트** (`constitution_prompt`): 사용자 커스텀 규칙 (환각 금지, 출처 명시 등)

Gemini system prompt = 부서 mission + 헌법 역할 템플릿 + vibe + constitution_prompt

## 4. UI 정보 구조 (업그레이드)

### 4.1 CEO 커맨드 바 (상단)
| 버튼 | 기능 |
|------|------|
| 조직 설정 | 부서 신설·수정·삭제(비활성) |
| 직원 배치 | 부서별 AI 직원 배치·팀장 지정 |
| 역할·인격 설계 | 헌법 역할·인격어·프롬프트 편집 |
| 대표 일괄 지시 | 전체/선택 부서에 동시 업무 지시 |
| 보고서 보관함 | 저장된 아티팩트 조회·재다운로드 |
| LogShield 관제 | 기존 사이트 점검 |

### 4.2 부서 카드
- AI 팀장 + 실무 담당 + **팀원 목록**(각각 채팅 진입)
- ⚙ 부서 설정 / 📋 보고 / 💬 업무지시

### 4.3 FSM 상태 표시 (일괄 지시 패널)
`CEO_INPUTED` → `RUNNING` → `WAITING_APPROVAL` → `COMPLETED`

## 5. 구현 페이즈

### Phase 1 — 데이터 영속화 (본 세션)
- DB: `office_user_departments`, `office_user_employees`, `office_reports`, `office_ceo_orders`, `office_ceo_order_results`
- 시드 JSON + 사용자 오버레이 merge
- CRUD API

### Phase 2 — 조직·직원·인격 UI
- DeptManageDialog, EmployeeAssignDialog, PersonaEditorDialog
- DepartmentGrid 다직원 표시

### Phase 3 — CEO 일괄 지시 + 보고서 보관
- CeoBulkCommandPanel (fan-out Gemini)
- ReportArchiveDrawer
- 채팅/보고 자동 저장

### Phase 4 — 고도화 (후속)
- SSE FSM 스트림, OpenAI/Gemini 비대칭 라우팅, ZIP 번들 S3

## 6. 성공 기준
- [ ] 부서 CRUD 동작
- [ ] 직원 배치·팀장 지정 동작
- [ ] 인격어 반영 채팅 답변
- [ ] 보고서 DB 저장·보관함 조회
- [ ] CEO 일괄 지시 → 부서별 답변 → 승인 → 보관

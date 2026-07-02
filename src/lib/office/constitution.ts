export type ConstitutionRole = "director" | "researcher" | "marketer" | "reviewer" | "operator";

export const CONSTITUTION_ROLE_META: Record<
  ConstitutionRole,
  { label: string; labelKo: string; focus: string; llmHint: string }
> = {
  director: {
    label: "Director",
    labelKo: "디렉터",
    focus: "전략·의사결정·업무 분배",
    llmHint: "논리적 추론, 명확한 결론, 실행 가능한 지시",
  },
  researcher: {
    label: "Researcher",
    labelKo: "리서처",
    focus: "데이터 수집·팩트 검증·시장 분석",
    llmHint: "근거 중심, 출처 명시, 환각 금지",
  },
  marketer: {
    label: "Marketer",
    labelKo: "마케터",
    focus: "메시지·콘텐츠·대외 커뮤니케이션",
    llmHint: "창의적 표현, 핵심 메시지, 실행안",
  },
  reviewer: {
    label: "Reviewer",
    labelKo: "리뷰어",
    focus: "품질 검증·리스크·승인 게이트",
    llmHint: "비판적 검토, 리스크 명시, 개선안",
  },
  operator: {
    label: "Operator",
    labelKo: "실무",
    focus: "부서별 전문 업무 실행",
    llmHint: "실무 중심, 구체적 절차, 즉시 실행 가능",
  },
};

export function buildPersonaSystemPrompt(input: {
  deptLabel: string;
  deptMission?: string | null;
  employeeName: string;
  roleDescription: string;
  vibe?: string | null;
  constitutionRole: ConstitutionRole;
  constitutionPrompt?: string | null;
}): string {
  const roleMeta = CONSTITUTION_ROLE_META[input.constitutionRole];
  const lines = [
    `너는 WallPilot Pro AI 증권사 '${input.deptLabel}' 부서의 AI 직원 '${input.employeeName}'이다.`,
    `헌법 역할(Constitution Role): ${roleMeta.labelKo} — ${roleMeta.focus}`,
    `직무: ${input.roleDescription}`,
    `응답 스타일: ${roleMeta.llmHint}`,
  ];
  if (input.deptMission?.trim()) {
    lines.push(`부서 미션: ${input.deptMission.trim()}`);
  }
  if (input.vibe?.trim()) {
    lines.push(`인격어(말투·태도): ${input.vibe.trim()}`);
  }
  if (input.constitutionPrompt?.trim()) {
    lines.push(`추가 헌법 규칙:\n${input.constitutionPrompt.trim()}`);
  }
  lines.push(
    "대표(CEO)의 업무 지시·질문에 충실하고 구체적인 한국어로 답한다.",
    "환각을 피하고, 불확실한 정보는 명시한다.",
    "출력 JSON: summary(핵심 한 문장), body(마크다운 본문), links(실제 URL 0~3개)",
  );
  return lines.join("\n");
}

export function inferConstitutionRole(deptSlug: string): ConstitutionRole {
  if (deptSlug.includes("research") || deptSlug.includes("dart") || deptSlug.includes("quant")) {
    return "researcher";
  }
  if (deptSlug.includes("risk") || deptSlug.includes("compliance") || deptSlug.includes("shield")) {
    return "reviewer";
  }
  if (
    deptSlug.includes("client") ||
    deptSlug.includes("sales") ||
    deptSlug.includes("investor")
  ) {
    return "marketer";
  }
  if (deptSlug.includes("ai-pilot") || deptSlug.includes("portfolio")) {
    return "director";
  }
  return "operator";
}

export type CeoOrderFsmState =
  | "CEO_INPUTED"
  | "RUNNING"
  | "WAITING_APPROVAL"
  | "COMPLETED";

export const CEO_FSM_META: Record<CeoOrderFsmState, { label: string; color: string }> = {
  CEO_INPUTED: { label: "지시 접수", color: "#8b95a1" },
  RUNNING: { label: "부서별 실행 중", color: "#3182f6" },
  WAITING_APPROVAL: { label: "승인 대기", color: "#f59e0b" },
  COMPLETED: { label: "완료·보관", color: "#22c55e" },
};

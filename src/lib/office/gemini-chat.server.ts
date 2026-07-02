import {
  buildPersonaSystemPrompt,
  type ConstitutionRole,
} from "@/lib/office/constitution";
import {
  hybridStructuredChat,
  type OfficeChatTurn,
} from "@/lib/office/llm-routing.server";
import { normalizeMarkdown } from "@/lib/office/markdown";
import type { DeptReportInput, OfficeChatResult } from "@/lib/office/types";

export type { OfficeChatTurn };

export async function runOfficeTeamChat(input: {
  message: string;
  deptLabel: string;
  role: string;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
  history?: OfficeChatTurn[];
  persona?: {
    employeeName: string;
    deptMission?: string | null;
    vibe?: string | null;
    constitutionRole?: string;
    constitutionPrompt?: string | null;
  };
}): Promise<OfficeChatResult> {
  const constitutionRole = (input.persona?.constitutionRole as ConstitutionRole) ?? "operator";

  const sys = input.persona
    ? buildPersonaSystemPrompt({
        deptLabel: input.deptLabel,
        deptMission: input.persona.deptMission,
        employeeName: input.persona.employeeName,
        roleDescription: input.role,
        vibe: input.persona.vibe,
        constitutionRole,
        constitutionPrompt: input.persona.constitutionPrompt,
      })
    : `너는 WallPilot Pro AI 증권사의 '${input.deptLabel}' 팀장이자 실무 전문가다. 역할: ${input.role}.
대표(사용자)의 업무 지시·질문에 충실하고 구체적인 한국어 본문으로 답한다.
JSON 출력: summary(핵심 한 문장), body(마크다운), links(실제 URL 0~3개)`;

  const { data: parsed, vendor, usedFallback } = await hybridStructuredChat({
    system: sys,
    userMessage: input.message,
    history: input.history,
    constitutionRole,
    geminiApiKey: input.geminiApiKey,
    openaiApiKey: input.openaiApiKey,
  });

  if (!parsed?.summary && !parsed?.body) {
    return {
      summary: "API 키 필요",
      body: "GEMINI_API_KEY 또는 OPENAI_API_KEY(또는 My API Gemini)를 설정해 주세요.",
      links: [],
      llm_vendor: null,
      llm_fallback: false,
    };
  }

  const links = (parsed.links ?? []).filter(
    (l) => l?.url && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(l.url),
  );

  return {
    summary: parsed.summary ?? "",
    body: normalizeMarkdown(parsed.body ?? ""),
    links: links.slice(0, 3),
    llm_vendor: vendor,
    llm_fallback: usedFallback,
  };
}

export async function generateDeptReportBody(input: DeptReportInput): Promise<string> {
  const sys = `너는 WallPilot Pro '${input.deptLabel}' 부서 팀장 ${input.leaderName}이다.
아래 항목을 바탕으로 대표에게 제출하는 정기 업무 보고서를 한국어 마크다운으로 작성한다.
구조: ## 요약 → ## 주요 이슈 → ## 조치 사항 → ## 다음 단계
JSON: { "body": "..." }`;

  const userMsg = `보고 항목:\n${input.items.map((x) => `- ${x}`).join("\n")}`;

  const { data } = await hybridStructuredChat({
    system: sys,
    userMessage: userMsg,
    constitutionRole: "director",
  });

  return normalizeMarkdown(data?.body ?? input.items.join("\n"));
}

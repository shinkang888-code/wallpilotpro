import { getServerConfig } from "@/lib/config.server";
import { normalizeMarkdown } from "@/lib/office/markdown";
import type { DeptReportInput, OfficeChatResult } from "@/lib/office/types";

const MODEL = "gemini-2.5-flash";
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function geminiJson<T>(
  system: string,
  userMessage: string,
  schema: Record<string, unknown>,
  apiKey: string,
): Promise<T | null> {
  const res = await fetch(`${BASE}/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    }),
  });

  if (!res.ok) return null;

  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function runOfficeTeamChat(input: {
  message: string;
  deptLabel: string;
  role: string;
  geminiApiKey?: string | null;
}): Promise<OfficeChatResult> {
  const key = input.geminiApiKey?.trim() || getServerConfig().geminiApiKey;
  if (!key) {
    return {
      summary: "API 키 필요",
      body: "GEMINI_API_KEY 또는 My API에서 Gemini 키를 설정해 주세요.",
      links: [],
    };
  }

  const sys = `너는 WallPilot Pro AI 증권사의 '${input.deptLabel}' 팀장이자 실무 전문가다. 역할: ${input.role}.
대표(사용자)의 업무 지시·질문에 충실하고 구체적인 한국어 본문으로 답한다.
- summary: 핵심 결론 한 문장
- body: 마크다운 본문 (제목, 목록, 표 활용)
- links: 실제 존재하는 URL만 0~3개, 없으면 빈 배열`;

  const parsed = await geminiJson<{
    summary?: string;
    body?: string;
    links?: Array<{ label: string; url: string }>;
  }>(
    sys,
    input.message,
    {
      type: "object",
      properties: {
        summary: { type: "string" },
        body: { type: "string" },
        links: {
          type: "array",
          items: {
            type: "object",
            properties: { label: { type: "string" }, url: { type: "string" } },
            required: ["label", "url"],
          },
        },
      },
      required: ["summary", "body"],
    },
    key,
  );

  if (!parsed?.summary && !parsed?.body) {
    return { summary: "", body: "응답을 생성하지 못했습니다.", links: [] };
  }

  const links = (parsed.links ?? []).filter(
    (l) => l?.url && /^https:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(l.url),
  );

  return {
    summary: parsed.summary ?? "",
    body: normalizeMarkdown(parsed.body ?? ""),
    links: links.slice(0, 3),
  };
}

export async function generateDeptReportBody(input: DeptReportInput): Promise<string> {
  const key = getServerConfig().geminiApiKey;
  if (!key) {
    return input.items.map((item, i) => `${i + 1}. ${item}`).join("\n");
  }

  const sys = `너는 WallPilot Pro '${input.deptLabel}' 부서 팀장 ${input.leaderName}이다.
아래 항목을 바탕으로 대표에게 제출하는 정기 업무 보고서를 한국어 마크다운으로 작성한다.
구조: ## 요약 → ## 주요 이슈 → ## 조치 사항 → ## 다음 단계`;

  const userMsg = `보고 항목:\n${input.items.map((x) => `- ${x}`).join("\n")}`;

  const parsed = await geminiJson<{ body?: string }>(
    sys,
    userMsg,
    {
      type: "object",
      properties: { body: { type: "string" } },
      required: ["body"],
    },
    key,
  );

  return normalizeMarkdown(parsed?.body ?? input.items.join("\n"));
}

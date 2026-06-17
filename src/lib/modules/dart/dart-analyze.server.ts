import { getGeminiKeyBundle } from "@/lib/gemini/resolve-gemini-key.server";
import type { GeminiKeySource } from "@/lib/gemini/gemini-key-resolution";
import type { DartAiMode, DartMetricHealth } from "@/lib/modules/dart/types";
import { formatMetricHealthForPrompt } from "@/lib/modules/dart/dart-metrics-health.server";

const SYSTEM_KR = `당신은 한국 상장기업 재무분석 전문 CPA(공인회계사)이자 K-IFRS 실무 애널리스트입니다.
DART(전자공시) 데이터만 근거로, 비전문 투자자도 이해할 수 있게 설명합니다.

규칙:
1. 제공된 데이터에만 기근하세요. 외부 지식으로 수치를 보충하지 마세요.
2. 금액은 반드시 **백만원** 단위로 표기하고, 출처 연도를 명시하세요.
3. 수치 2개 이상 비교 시 마크다운 테이블을 사용하세요.
4. 구조 (반드시 ## 헤딩 사용):
   ## 핵심 요약
   ## 재무 건전성 (부채·유동성)
   ## 수익성·성장 (매출·영업·ROE)
   ## 공시·리스크
   ## CPA 결론
5. 사전 CPA 판정(good/caution/risk)과 일치하도록 양호/주의/위험을 명시하세요.
6. 긍정·부정 신호를 균형 있게 제시하고, 데이터 한계를 한 문장으로 밝히세요.
7. 데이터 없으면 "해당 데이터 미포함"이라고 쓰세요.
8. 한국어로 작성하세요.`;

export type DartAiExplanation = {
  markdown: string;
  aiMode: DartAiMode;
  aiSource: GeminiKeySource;
};

function fallbackExplanation(corpName: string, context: string): string {
  const metricsBlock = context.match(/## 주요 지표[\s\S]*?(?=##|$)/)?.[0] ?? "";
  return `## 핵심 요약
${corpName}의 DART 공시 데이터를 조회했습니다. **CPA AI 해설**을 받으려면 Vercel \`GEMINI_API_KEY\` 또는 My API Gemini 키를 설정한 뒤 다시 분석하세요.

## 참고 데이터
${metricsBlock || "핵심 지표 탭에서 자동 계산 수치를 확인하세요."}

## CPA 결론
공시 원문·재무제표 탭에서 수치를 검증한 뒤, Gemini 키 설정 후 CPA 관점 해설을 다시 실행해 주세요.`;
}

async function callGeminiCpa(prompt: string, apiKey: string, timeoutMs: number): Promise<string | null> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature: 0.25 },
      contents: [{ parts: [{ text: prompt }] }],
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  return text && text.length > 120 ? text : null;
}

export async function explainDartWithAi(
  contextMarkdown: string,
  corpName: string,
  metricHealth: DartMetricHealth,
  geminiApiKey?: string | null,
): Promise<DartAiExplanation> {
  const bundle = getGeminiKeyBundle(geminiApiKey);
  const fallback = fallbackExplanation(corpName, contextMarkdown);

  if (!bundle.activeKey) {
    return { markdown: fallback, aiMode: "fallback", aiSource: "none" };
  }

  const healthBlock = formatMetricHealthForPrompt(metricHealth);
  const prompt = `${SYSTEM_KR}

## 사전 CPA 지표 판정 (UI와 동일 기준)
${healthBlock}

아래 DART 컨텍스트를 분석해 주세요.

${contextMarkdown}`;

  try {
    const text = await callGeminiCpa(prompt, bundle.activeKey, 45_000);
    if (text) {
      return { markdown: text, aiMode: "gemini", aiSource: bundle.activeSource };
    }
  } catch {
    /* fall through to fallback */
  }

  return { markdown: fallback, aiMode: "fallback", aiSource: bundle.activeSource };
}

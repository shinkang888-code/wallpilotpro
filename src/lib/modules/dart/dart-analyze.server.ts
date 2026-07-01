import { getGeminiKeyBundle } from "@/lib/gemini/resolve-gemini-key.server";
import type { GeminiKeySource } from "@/lib/gemini/gemini-key-resolution";
import { buildRuleBasedCpaExplanation } from "@/lib/modules/dart/dart-cpa-rules.server";
import type { DartAiMode, DartKeyMetrics, DartMetricHealth } from "@/lib/modules/dart/types";
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

async function callGeminiCpa(
  prompt: string,
  apiKey: string,
  timeoutMs: number,
): Promise<{ text: string | null; rateLimited: boolean }> {
  const model = "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 800 * attempt));

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: { temperature: 0.25 },
          contents: [{ parts: [{ text: prompt }] }],
        }),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (res.status === 429) continue;

      if (!res.ok) return { text: null, rateLimited: res.status === 429 };

      const json = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (text && text.length >= 80) return { text, rateLimited: false };
      return { text: null, rateLimited: false };
    } catch {
      /* retry */
    }
  }

  return { text: null, rateLimited: true };
}

export async function explainDartWithAi(
  contextMarkdown: string,
  corpName: string,
  metrics: DartKeyMetrics,
  metricHealth: DartMetricHealth,
  geminiApiKey?: string | null,
): Promise<DartAiExplanation> {
  const bundle = getGeminiKeyBundle(geminiApiKey);
  const rulesMarkdown = buildRuleBasedCpaExplanation(
    corpName,
    metrics,
    metricHealth,
    contextMarkdown,
  );

  if (!bundle.activeKey) {
    return { markdown: rulesMarkdown, aiMode: "rules", aiSource: "none" };
  }

  const healthBlock = formatMetricHealthForPrompt(metricHealth);
  const prompt = `${SYSTEM_KR}

## 사전 CPA 지표 판정 (UI와 동일 기준)
${healthBlock}

아래 DART 컨텍스트를 분석해 주세요.

${contextMarkdown}`;

  const { text, rateLimited } = await callGeminiCpa(prompt, bundle.activeKey, 45_000);
  if (text) {
    return { markdown: text, aiMode: "gemini", aiSource: bundle.activeSource };
  }

  const suffix = rateLimited
    ? "\n\n---\n_Gemini API 일시 제한(429)으로 OpenDART 지표 기반 CPA 해설을 표시합니다. 잠시 후 다시 실행하면 AI 해설을 받을 수 있습니다._"
    : "\n\n---\n_Gemini 응답 실패 — OpenDART 지표 기반 CPA 해설을 표시합니다._";

  return {
    markdown: `${rulesMarkdown}${suffix}`,
    aiMode: "rules",
    aiSource: bundle.activeSource,
  };
}

import { callGeminiText } from "@/lib/api/gemini-json.server";

const SYSTEM_KR = `당신은 한국 상장기업 재무분석 전문 CPA(회계사)이자 애널리스트입니다.
DART(전자공시) 데이터만 근거로, 비전문 투자자도 이해할 수 있게 설명합니다.

규칙:
1. 제공된 데이터에만 기근하세요. 외부 지식으로 수치를 보충하지 마세요.
2. 금액은 반드시 **백만원** 단위로 표기하고, 출처 연도를 명시하세요.
3. 수치 2개 이상 비교 시 마크다운 테이블을 사용하세요.
4. 구조: ## 핵심 요약 → ## 재무 건전성 → ## 수익성·성장 → ## 공시·리스크 → ## 결론
5. 부채비율·ROE·영업이익률에 대해 양호/주의/위험 판단을 포함하세요.
6. 긍정·부정 신호를 균형 있게 제시하세요.
7. 데이터 없으면 "해당 데이터 미포함"이라고 쓰세요.
8. 한국어로 작성하세요.`;

function fallbackExplanation(corpName: string, context: string): string {
  const metricsBlock = context.match(/## 주요 지표[\s\S]*?(?=##|$)/)?.[0] ?? "";
  return `## 핵심 요약
${corpName}의 DART 공시 데이터를 조회했습니다. AI 해설을 위해 GEMINI_API_KEY 또는 My API Gemini 키를 설정하면 CPA 관점의 상세 분석을 받을 수 있습니다.

## 참고 데이터
${metricsBlock || "자동 계산 지표를 확인하세요."}

## 결론
원본 재무제표·공시 탭에서 수치를 확인한 뒤, Gemini 키 설정 후 다시 분석을 실행해 주세요.`;
}

export async function explainDartWithAi(
  contextMarkdown: string,
  corpName: string,
  geminiApiKey?: string | null,
): Promise<string> {
  const prompt = `${SYSTEM_KR}

아래 DART 컨텍스트를 분석해 주세요.

${contextMarkdown}`;

  return callGeminiText(prompt, fallbackExplanation(corpName, contextMarkdown), {
    apiKey: geminiApiKey,
    timeoutMs: 35_000,
    temperature: 0.25,
  });
}

import { callGeminiText } from "@/lib/api/gemini-json.server";
import type { DebateVerdict, RiskGateResult } from "@/lib/types/agent";
import type { WallStreetReport } from "@/lib/types/stock";

function fallbackKoreanNarrative(
  report: WallStreetReport,
  debate: DebateVerdict,
  risk: RiskGateResult,
): string {
  const price =
    report.currency === "USD"
      ? `$${report.price.toFixed(2)}`
      : `₩${Math.round(report.price).toLocaleString("ko-KR")}`;
  const fair =
    report.currency === "USD"
      ? `$${report.combined.fairValue.toFixed(2)}`
      : `₩${Math.round(report.combined.fairValue).toLocaleString("ko-KR")}`;

  return `# ${report.name} (${report.ticker}) — 심층 리서치 해설

## 종합 요약
현재가 ${price}, 내재가치 추정 ${fair} 기준 안전마진은 ${report.combined.marginOfSafetyPct.toFixed(1)}%입니다.
종합 의견은 **${report.combined.recommendation}**, 포트폴리오 등급은 **${debate.rating}** 입니다.
${report.technicalLabel ? `기술적 지표: ${report.technicalLabel}` : ""}

## 강세 시나리오 (상세)
${debate.bullCase}

린치 관점: PEG ${report.lynch.pegRatio.toFixed(2)}, 린치 점수 ${report.lynch.lynchScore}, 유형 ${report.lynch.companyType}.
그린블라트 관점: ROIC ${report.greenblatt.roic}%, EY ${report.greenblatt.earningsYield}%, 매직 점수 ${report.greenblatt.magicScore}.

## 약세 시나리오 (상세)
${debate.bearCase}

밸류에이션 프리미엄/디스카운트와 거시 변동성이 단기 수익률을 제한할 수 있습니다.

## 리서치 매니저 판정
${debate.verdict}

## 리스크 게이트 해석
자동 주문 ${risk.approved ? "허용" : "차단"}: ${risk.reason}
- 공격적 관점: ${risk.aggressiveView}
- 보수적 관점: ${risk.conservativeView}

## 투자 실행 가이드
- 매수 구간: ${report.combined.buyingZone}
- 익절 목표: ${report.combined.profitTarget}
- 손절 기준: ${report.combined.hardStop}

## 핵심 촉매
${report.catalysts.map((c) => `- ${c}`).join("\n")}

※ 본 해설은 영문 에이전트 리포트를 바탕으로 한 요약이며, 투자 권유가 아닙니다.`;
}

export async function generateDeepReportKorean(input: {
  report: WallStreetReport;
  debate: DebateVerdict;
  riskGate: RiskGateResult;
  markdownEn: string;
  geminiApiKey?: string | null;
}): Promise<string> {
  const { report, debate, riskGate, markdownEn } = input;
  const fallback = fallbackKoreanNarrative(report, debate, riskGate);

  const prompt = `You are a senior Korean equity research analyst writing for professional investors.
Translate AND significantly expand the English deep agent report below into Korean markdown.

Rules:
- Write ONLY in Korean (tickers and proper nouns like NASDAQ may stay in English).
- Use markdown headers: ## 종합 요약, ## 강세 시나리오 (상세), ## 약세 시나리오 (상세), ## 리서치 매니저 판정, ## 리스크 게이트 해석, ## 투자 실행 가이드, ## 핵심 촉매·일정
- Each section: 2-4 rich paragraphs with numbers from the data (price, fair value, margin %, Lynch/Greenblatt metrics).
- Explain jargon in plain Korean for retail readers.
- Include actionable buy/sell discipline referencing buying zone and profit target.
- Total length: 900-1400 Korean characters minimum.
- Do not invent facts not implied by the source data.

English report:
${markdownEn}

Structured data:
- Ticker: ${report.ticker} (${report.name}) · ${report.market}
- Price: ${report.price} ${report.currency} · Fair value: ${report.combined.fairValue}
- Margin of safety: ${report.combined.marginOfSafetyPct}%
- Lynch: PEG ${report.lynch.pegRatio}, score ${report.lynch.lynchScore}, ${report.lynch.recommendation}
- Greenblatt: ROIC ${report.greenblatt.roic}%, grade ${report.greenblatt.investmentGrade}
- Supply: ${report.supply.label}
- Catalysts: ${report.catalysts.join("; ")}

Return markdown only, no code fences.`;

  return callGeminiText(prompt, fallback, {
    temperature: 0.4,
    timeoutMs: 20_000,
    apiKey: input.geminiApiKey,
  });
}

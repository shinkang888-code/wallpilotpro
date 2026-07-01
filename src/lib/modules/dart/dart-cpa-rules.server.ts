import type { DartKeyMetrics, DartMetricGrade, DartMetricHealth } from "@/lib/modules/dart/types";

function gradeKo(g: DartMetricGrade): string {
  if (g === "good") return "양호";
  if (g === "caution") return "주의";
  if (g === "risk") return "위험";
  return "해당없음";
}

function fmtM(n: number | null): string {
  if (n == null) return "데이터 없음";
  return `${Math.round(n).toLocaleString("ko-KR")}백만원`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "데이터 없음";
  return `${n.toFixed(1)}%`;
}

function narrativeForGrade(name: string, grade: DartMetricGrade, value: string): string {
  if (grade === "good") return `${name} ${value} — 업종 평균 대비 **양호** 구간으로 재무 여력이 비교적 안정적입니다.`;
  if (grade === "caution") return `${name} ${value} — **주의** 구간입니다. 추세 악화 시 현금흐름·차입 여력을 점검해야 합니다.`;
  if (grade === "risk") return `${name} ${value} — **위험** 신호입니다. 구조조정·추가 자본·차입 만기 분포를 우선 확인하세요.`;
  return `${name} 공시 데이터가 부족해 CPA 판정을 내릴 수 없습니다.`;
}

function extractPeriod(contextMarkdown: string): string {
  const m = contextMarkdown.match(/(\d{4})년\s+([^\n]+)/);
  return m ? `${m[1]}년 ${m[2].trim()}` : "최근 사업보고서 기준";
}

/** OpenDART 지표 기반 CPA 해설 — Gemini 없이도 실질 분석 제공. */
export function buildRuleBasedCpaExplanation(
  corpName: string,
  metrics: DartKeyMetrics,
  metricHealth: DartMetricHealth,
  contextMarkdown: string,
): string {
  const period = extractPeriod(contextMarkdown);
  const { debtRatio, roe, operatingMargin, currentRatio } = metricHealth;

  const riskFlags = [debtRatio, roe, operatingMargin, currentRatio]
    .filter((h) => h.grade === "risk")
    .length;
  const goodFlags = [debtRatio, roe, operatingMargin, currentRatio]
    .filter((h) => h.grade === "good")
    .length;

  let overall: string;
  if (riskFlags >= 2) overall = "**종합: 위험** — 핵심 재무비율 다수가 stress 구간입니다.";
  else if (riskFlags === 1) overall = "**종합: 주의** — 일부 지표는 양호하나 리스크 요인이 존재합니다.";
  else if (goodFlags >= 3) overall = "**종합: 양호** — 주요 K-IFRS 지표가 전반적으로 안정적입니다.";
  else overall = "**종합: 중립·주의** — 강점과 약점이 혼재합니다. 공시 원문 검증이 필요합니다.";

  const disclosureBlock = contextMarkdown.match(/## 최근 공시[\s\S]*?(?=##|$)/)?.[0]?.trim();

  return `## 핵심 요약
${corpName} (${period}) DART 공시를 바탕으로 K-IFRS 핵심 지표를 CPA 관점에서 해석했습니다. ${overall}

| 지표 | 수치 | CPA 판정 |
| --- | --- | --- |
| 부채비율 | ${fmtPct(metrics.debtRatio)} | ${gradeKo(debtRatio.grade)} |
| ROE | ${fmtPct(metrics.roe)} | ${gradeKo(roe.grade)} |
| 영업이익률 | ${fmtPct(metrics.operatingMargin)} | ${gradeKo(operatingMargin.grade)} |
| 유동비율 | ${fmtPct(metrics.currentRatio)} | ${gradeKo(currentRatio.grade)} |

## 재무 건전성 (부채·유동성)
${narrativeForGrade("부채비율", debtRatio.grade, fmtPct(metrics.debtRatio))}

${narrativeForGrade("유동비율", currentRatio.grade, fmtPct(metrics.currentRatio))}

자산총계 ${fmtM(metrics.totalAssets)}, 부채총계 ${fmtM(metrics.totalLiabilities)}, 자본총계 ${fmtM(metrics.totalEquity)}.

## 수익성·성장 (매출·영업·ROE)
매출액 ${fmtM(metrics.revenue)}, 영업이익 ${fmtM(metrics.operatingIncome)}, 당기순이익 ${fmtM(metrics.netIncome)}.

${narrativeForGrade("영업이익률", operatingMargin.grade, fmtPct(metrics.operatingMargin))}

${narrativeForGrade("ROE", roe.grade, fmtPct(metrics.roe))}

## 공시·리스크
${disclosureBlock ? `${disclosureBlock.replace(/^##[^\n]*\n?/, "").slice(0, 600)}…` : "최근 공시 목록은 공시 탭에서 확인하세요. 단일 분기/사업보고서 수치만으로 장기 추세를 단정하지 마세요."}

## CPA 결론
${overall} 투자·신용 판단 전 DART **재무제표·주석 원문**으로 계정 분류·일회성 항목·관계사 거래를 반드시 교차 검증하세요. 본 해설은 OpenDART 자동 계산 지표 기반이며, 감사·투자 자문이 아닙니다.`;
}

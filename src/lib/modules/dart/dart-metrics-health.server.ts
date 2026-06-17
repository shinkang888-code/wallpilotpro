import type { DartKeyMetrics, DartMetricGrade, DartMetricHealthItem } from "@/lib/modules/dart/types";

function gradeDebtRatio(v: number | null): DartMetricGrade {
  if (v == null) return "na";
  if (v < 100) return "good";
  if (v <= 200) return "caution";
  return "risk";
}

function gradeRoe(v: number | null): DartMetricGrade {
  if (v == null) return "na";
  if (v >= 10) return "good";
  if (v >= 5) return "caution";
  return "risk";
}

function gradeOperatingMargin(v: number | null): DartMetricGrade {
  if (v == null) return "na";
  if (v >= 8) return "good";
  if (v >= 0) return "caution";
  return "risk";
}

function gradeCurrentRatio(v: number | null): DartMetricGrade {
  if (v == null) return "na";
  if (v >= 150) return "good";
  if (v >= 100) return "caution";
  return "risk";
}

function item(value: number | null, grade: DartMetricGrade): DartMetricHealthItem {
  return { value, grade };
}

/** CPA-style heuristic grades for K-IFRS headline ratios (OpenDART derived). */
export function gradeDartMetrics(metrics: DartKeyMetrics): {
  debtRatio: DartMetricHealthItem;
  roe: DartMetricHealthItem;
  operatingMargin: DartMetricHealthItem;
  currentRatio: DartMetricHealthItem;
} {
  return {
    debtRatio: item(metrics.debtRatio, gradeDebtRatio(metrics.debtRatio)),
    roe: item(metrics.roe, gradeRoe(metrics.roe)),
    operatingMargin: item(metrics.operatingMargin, gradeOperatingMargin(metrics.operatingMargin)),
    currentRatio: item(metrics.currentRatio, gradeCurrentRatio(metrics.currentRatio)),
  };
}

export function formatMetricHealthForPrompt(health: ReturnType<typeof gradeDartMetrics>): string {
  const gradeKo = (g: DartMetricGrade) =>
    g === "good" ? "양호" : g === "caution" ? "주의" : g === "risk" ? "위험" : "해당없음";
  const line = (name: string, h: DartMetricHealthItem) => {
    const val = h.value == null ? "-" : `${h.value.toFixed(1)}%`;
    return `- ${name}: ${val} → CPA 판정 **${gradeKo(h.grade)}** (${h.grade})`;
  };
  return [
    line("부채비율", health.debtRatio),
    line("ROE", health.roe),
    line("영업이익률", health.operatingMargin),
    line("유동비율", health.currentRatio),
  ].join("\n");
}

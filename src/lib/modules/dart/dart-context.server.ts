import type {
  DartCompanyProfile,
  DartDisclosure,
  DartFinancialSnapshot,
  DartKeyMetrics,
} from "@/lib/modules/dart/types";

function fmtMillion(n: number | null): string {
  if (n == null) return "-";
  return `${Math.round(n).toLocaleString("ko-KR")}백만원`;
}

function fmtPct(n: number | null): string {
  if (n == null) return "-";
  return `${n.toFixed(1)}%`;
}

function topAccounts(financials: DartFinancialSnapshot | null, limit = 12): string {
  if (!financials?.rows.length) return "(재무제표 데이터 없음)";

  const picked = financials.rows
    .filter((r) => r.currentAmount != null && Math.abs(r.currentAmount!) > 0)
    .slice(0, limit);

  const lines = [
    `| 구분 | 계정과목 | 당기 | 전기 |`,
    `| --- | --- | --- | --- |`,
    ...picked.map(
      (r) =>
        `| ${r.sjDiv} | ${r.accountNm} | ${fmtMillion(r.currentAmount)} | ${fmtMillion(r.priorAmount)} |`,
    ),
  ];
  return lines.join("\n");
}

export function buildDartContextMarkdown(input: {
  profile: DartCompanyProfile;
  disclosures: DartDisclosure[];
  financials: DartFinancialSnapshot | null;
  metrics: DartKeyMetrics;
  sidecarContext?: string | null;
}): string {
  const { profile, disclosures, financials, metrics, sidecarContext } = input;
  const year = financials?.bsnsYear ?? "-";

  const disclosureLines = disclosures.slice(0, 8).map(
    (d) => `- ${d.rceptDt} · ${d.reportNm}${d.flrNm ? ` (${d.flrNm})` : ""}`,
  );

  const sections = [
    `# DART 데이터 컨텍스트 — ${profile.corpName} (${profile.stockCode})`,
    "",
    "## 데이터 기준",
    `- 회사: ${profile.corpName} · 종목 ${profile.stockCode} · corp_code ${profile.corpCode}`,
    `- 재무제표: ${year}년 ${financials?.reprtName ?? "사업보고서"} · ${financials?.fsDiv === "CFS" ? "연결" : "별도"}`,
    `- 금액 단위: **백만원** (OpenDART thstrm_amount 기준)`,
    "",
    "## 회사 개황",
    `- 대표: ${profile.ceoNm ?? "-"}`,
    `- 설립: ${profile.estDt ?? "-"}`,
    `- 업종코드: ${profile.indutyCode ?? "-"}`,
    `- 법인구분: ${profile.corpCls ?? "-"}`,
    "",
    "## 주요 지표 (자동계산)",
    "| 지표 | 값 |",
    "| --- | --- |",
    `| 매출액 | ${fmtMillion(metrics.revenue)} |`,
    `| 영업이익 | ${fmtMillion(metrics.operatingIncome)} |`,
    `| 당기순이익 | ${fmtMillion(metrics.netIncome)} |`,
    `| 자산총계 | ${fmtMillion(metrics.totalAssets)} |`,
    `| 부채총계 | ${fmtMillion(metrics.totalLiabilities)} |`,
    `| 자본총계 | ${fmtMillion(metrics.totalEquity)} |`,
    `| 부채비율 | ${fmtPct(metrics.debtRatio)} |`,
    `| 영업이익률 | ${fmtPct(metrics.operatingMargin)} |`,
    `| ROE | ${fmtPct(metrics.roe)} |`,
    `| 유동비율 | ${fmtPct(metrics.currentRatio)} |`,
    "",
    "## 재무제표 주요 계정",
    topAccounts(financials),
    "",
    "## 최근 공시 (최대 8건)",
    disclosureLines.length ? disclosureLines.join("\n") : "- 최근 공시 없음",
  ];

  if (sidecarContext) {
    sections.push("", "## DartLab Sidecar (고급 데이터)", sidecarContext);
  }

  return sections.join("\n");
}

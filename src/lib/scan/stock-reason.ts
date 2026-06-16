import type { StockRow } from "@/lib/types/stock";

export type ScanColumn = "short_squeeze" | "high_cash";

export function buildStockReasons(
  row: StockRow,
  columns: ScanColumn[],
  lang: "ko" | "en",
): string[] {
  const reasons: string[] = [];

  if (columns.includes("short_squeeze")) {
    reasons.push(
      lang === "ko"
        ? "숏 스퀴즈·모멘텀 스크리너 상위 — 거래량·수급·기술적 반등 셋업"
        : "Top short-squeeze / momentum screen — volume, flow, and technical rebound setup",
    );
  }
  if (columns.includes("high_cash")) {
    reasons.push(
      lang === "ko"
        ? "고현금·컴파운더 스크리너 상위 — 재무 방어력·밸류에이션 통과"
        : "Top high-cash compounder screen — balance-sheet strength and valuation pass",
    );
  }

  reasons.push(
    lang === "ko"
      ? `포트폴리오 등급 ${row.rating} · 30일 모멘텀 ${row.momentum.toFixed(0)}`
      : `Rating ${row.rating} · 30D momentum ${row.momentum.toFixed(0)}`,
  );

  if (row.guruBadges.length > 0) {
    reasons.push(
      lang === "ko"
        ? `퀀트 신호: ${row.guruBadges.join(" · ")}`
        : `Quant signals: ${row.guruBadges.join(" · ")}`,
    );
  }

  if (row.technicalLabel) {
    reasons.push(
      lang === "ko" ? `기술적 지표: ${row.technicalLabel}` : `Technical: ${row.technicalLabel}`,
    );
  }

  if (row.debate?.verdict) {
    reasons.push(
      lang === "ko"
        ? `Bull/Bear 토론 판정: ${row.debate.verdict}`
        : `Bull/Bear debate: ${row.debate.verdict}`,
    );
  }

  for (const catalyst of row.catalysts.slice(0, 4)) {
    if (!reasons.includes(catalyst)) reasons.push(catalyst);
  }

  return reasons;
}

export type ScanPickItem = {
  row: StockRow;
  columns: ScanColumn[];
};

export function mergeScanPicks(
  shortSqueeze: StockRow[],
  highCash: StockRow[],
): ScanPickItem[] {
  const map = new Map<string, ScanPickItem>();

  for (const row of shortSqueeze) {
    map.set(row.ticker, { row, columns: ["short_squeeze"] });
  }
  for (const row of highCash) {
    const existing = map.get(row.ticker);
    if (existing) {
      existing.columns.push("high_cash");
    } else {
      map.set(row.ticker, { row, columns: ["high_cash"] });
    }
  }

  return [...map.values()];
}

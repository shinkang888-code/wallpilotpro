import type { SupplyDemandSignal, SupplyTrend } from "@/lib/quant/analyzers/types.server";

export type McpSupplyDemandSnapshot = {
  ticker: string;
  netAmountByInvestor?: {
    foreign?: number | null;
    institution?: number | null;
    individual?: number | null;
  };
  recent?: Array<{
    date: string;
    foreign: number | null;
    institution: number | null;
    individual: number | null;
  }>;
};

/** Institutional flow trend — adapted from korea-stock-analyzer-mcp SupplyDemandService. */
export function analyzeSupplyDemand(data: McpSupplyDemandSnapshot | null): SupplyDemandSignal {
  if (!data?.netAmountByInvestor) {
    return {
      foreignNetAmount: null,
      institutionNetAmount: null,
      individualNetAmount: null,
      trend: "neutral",
      label: "No supply data",
    };
  }

  const foreign = data.netAmountByInvestor.foreign ?? 0;
  const institution = data.netAmountByInvestor.institution ?? 0;
  const individual = data.netAmountByInvestor.individual ?? 0;

  const recent = data.recent ?? [];
  const recentForeign = recent.reduce((s, r) => s + (r.foreign ?? 0), 0);
  const recentInstitution = recent.reduce((s, r) => s + (r.institution ?? 0), 0);

  const foreignAccumulating = foreign > 0 && recentForeign >= 0;
  const foreignSelling = foreign < 0 && recentForeign <= 0;
  const instAccumulating = institution > 0 && recentInstitution >= 0;
  const instSelling = institution < 0 && recentInstitution <= 0;

  let trend: SupplyTrend = "neutral";
  if (foreignAccumulating && instAccumulating) trend = "strong_buy";
  else if (foreignAccumulating || instAccumulating) trend = "accumulating";
  else if (foreignSelling && instSelling) trend = "strong_sell";
  else if (foreignSelling || instSelling) trend = "selling";

  return {
    foreignNetAmount: foreign,
    institutionNetAmount: institution,
    individualNetAmount: individual,
    trend,
    label: supplyLabel(trend, foreign, institution),
  };
}

function supplyLabel(trend: SupplyTrend, foreign: number, institution: number): string {
  const fmt = (n: number) => `${n >= 0 ? "+" : ""}${(n / 1e8).toFixed(0)}억`;
  const base = `외국인 ${fmt(foreign)} · 기관 ${fmt(institution)}`;
  switch (trend) {
    case "strong_buy":
      return `${base} — 스마트머니 동반 매수`;
    case "accumulating":
      return `${base} — 누적 매수`;
    case "strong_sell":
      return `${base} — 동반 매도`;
    case "selling":
      return `${base} — 매도 우위`;
    default:
      return `${base} — 중립`;
  }
}

export function supplyTrendScore(trend: SupplyTrend): number {
  switch (trend) {
    case "strong_buy":
      return 25;
    case "accumulating":
      return 15;
    case "selling":
      return -10;
    case "strong_sell":
      return -20;
    default:
      return 0;
  }
}

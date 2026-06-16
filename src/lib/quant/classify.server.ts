import type { DebateVerdict } from "@/lib/types/agent";
import type { PortfolioRating } from "@/lib/types/rating";
import { ratingScore } from "@/lib/types/rating";
import type { RawMarketSnapshot, StockRow, ValuationResult } from "@/lib/types/stock";
import { formatBuyingZone, formatMoney } from "@/lib/quant/valuation.server";
import { supplyTrendScore } from "@/lib/quant/analyzers/supply-demand.server";
import { MATRIX_COLUMN_SIZE } from "@/lib/quant/matrix-config";
import { isVolumeSpike } from "@/lib/quant/screener.server";

export type AnalyzedRow = {
  snapshot: RawMarketSnapshot;
  valuation: ValuationResult;
  catalysts: string[];
  rating: PortfolioRating;
  debate?: DebateVerdict | null;
};

export function toStockRow(analyzed: AnalyzedRow): StockRow {
  const { snapshot, valuation, catalysts, rating, debate } = analyzed;
  return {
    ticker: snapshot.ticker,
    name: snapshot.name,
    market: snapshot.market,
    price: snapshot.price,
    currency: snapshot.currency,
    momentum: valuation.momentum,
    buyingZone: formatBuyingZone(
      valuation.buyingZoneLow,
      valuation.buyingZoneHigh,
      snapshot.currency,
    ),
    profitTarget: formatMoney(valuation.profitTarget, snapshot.currency),
    hardStop: formatMoney(valuation.hardStop, snapshot.currency),
    volPrediction: valuation.volPrediction,
    catalysts,
    guruBadges: valuation.guruBadges,
    rating,
    technicalLabel: snapshot.technical?.label,
    debate: debate ?? null,
    deepAnalyzed: Boolean(debate),
  };
}

const COLUMN_LIMIT = MATRIX_COLUMN_SIZE;

function squeezeScore(analyzed: AnalyzedRow): number {
  const { snapshot, valuation, debate } = analyzed;
  const supplyPts =
    snapshot.supplyTrend != null ? Math.round(supplyTrendScore(snapshot.supplyTrend) / 10) : 0;
  const techPts =
    snapshot.technical?.macdHistogram != null && snapshot.technical.macdHistogram > 0 ? 1 : 0;
  const debatePts = debate ? Math.max(0, ratingScore(debate.rating) - 3) : 0;
  return (
    (valuation.momentum >= 40 ? 2 : 0) +
    (isVolumeSpike(snapshot) ? 2 : 0) +
    (valuation.pegRatio != null && valuation.pegRatio < 1 ? 1 : 0) +
    Math.min(2, Math.max(0, supplyPts)) +
    techPts +
    debatePts
  );
}

function cashScore(row: AnalyzedRow): number {
  const { snapshot, valuation } = row;
  return (
    (snapshot.cashToMcap != null && snapshot.cashToMcap > 0.1 ? 2 : 0) +
    (valuation.quantitativeGrade === "Pass" ? 2 : 0) +
    (valuation.momentum >= 10 && valuation.momentum <= 35 ? 1 : 0)
  );
}

function compareSqueeze(a: AnalyzedRow, b: AnalyzedRow): number {
  return squeezeScore(b) - squeezeScore(a) || b.valuation.momentum - a.valuation.momentum;
}

function compareCash(a: AnalyzedRow, b: AnalyzedRow): number {
  return (
    cashScore(b) - cashScore(a) ||
    (b.snapshot.cashToMcap ?? 0) - (a.snapshot.cashToMcap ?? 0)
  );
}

function fillColumn(
  primary: AnalyzedRow[],
  fallback: AnalyzedRow[],
  limit: number,
  compare: (a: AnalyzedRow, b: AnalyzedRow) => number,
  exclude: Set<string>,
): AnalyzedRow[] {
  const picked: AnalyzedRow[] = [];
  for (const row of primary) {
    if (picked.length >= limit) break;
    if (exclude.has(row.snapshot.ticker)) continue;
    picked.push(row);
    exclude.add(row.snapshot.ticker);
  }
  if (picked.length < limit) {
    for (const row of [...primary, ...fallback].sort(compare)) {
      if (picked.length >= limit) break;
      if (exclude.has(row.snapshot.ticker)) continue;
      picked.push(row);
      exclude.add(row.snapshot.ticker);
    }
  }
  return picked;
}

export function classifyRows(analyzed: AnalyzedRow[]): {
  shortSqueeze: StockRow[];
  highCash: StockRow[];
} {
  const shortCandidates: AnalyzedRow[] = [];
  const cashCandidates: AnalyzedRow[] = [];

  for (const row of analyzed) {
    if (squeezeScore(row) >= cashScore(row)) shortCandidates.push(row);
    else cashCandidates.push(row);
  }

  shortCandidates.sort(compareSqueeze);
  cashCandidates.sort(compareCash);

  const used = new Set<string>();
  const shortRows = fillColumn(
    shortCandidates,
    cashCandidates,
    COLUMN_LIMIT,
    compareSqueeze,
    used,
  );
  const cashRows = fillColumn(
    cashCandidates,
    shortCandidates,
    COLUMN_LIMIT,
    compareCash,
    used,
  );

  return {
    shortSqueeze: shortRows.map(toStockRow),
    highCash: cashRows.map(toStockRow),
  };
}

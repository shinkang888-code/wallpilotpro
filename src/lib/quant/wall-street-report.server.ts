import { geminiAnalyzeStock } from "@/lib/api/gemini-analyze.server";
import { fetchNewsHeadlines } from "@/lib/api/news-data.server";
import { resolveStockInput } from "@/lib/api/stock-search.server";
import { enrichMarketSnapshot } from "@/lib/api/market-enrichment.server";
import { fetchMarketSnapshot } from "@/lib/api/market-data.server";
import { analyzeGreenblatt } from "@/lib/quant/analyzers/greenblatt.server";
import { analyzeLynch } from "@/lib/quant/analyzers/lynch.server";
import {
  calculateValuation,
  formatBuyingZone,
  formatMoney,
} from "@/lib/quant/valuation.server";
import type { UniverseEntry } from "@/lib/quant/universe.server";
import type { NewsHeadline } from "@/lib/api/news-data.server";
import type { GeminiAnalysisResult } from "@/lib/api/gemini-analyze.server";
import type { Market, RawMarketSnapshot, ValuationResult, WallStreetReport } from "@/lib/types/stock";

export type WallStreetReportContext = {
  snapshot: RawMarketSnapshot;
  valuation: ValuationResult;
  news: NewsHeadline[];
  gemini: GeminiAnalysisResult;
  report: WallStreetReport;
};

export function detectMarket(ticker: string): Market {
  const code = ticker.replace(/\.KS$|\.KQ$/i, "").trim();
  return /^[0-9]{6}$/.test(code) ? "KR" : "US";
}

export function normalizeTicker(ticker: string, market: Market): string {
  const raw = ticker.replace(/\.KS$|\.KQ$/i, "").trim().toUpperCase();
  return market === "KR" ? raw : raw;
}

export async function buildWallStreetReportContext(
  tickerInput: string,
  nameHint?: string,
  options?: { geminiApiKey?: string | null },
): Promise<WallStreetReportContext> {
  const resolved = await resolveStockInput(tickerInput);
  const entry: UniverseEntry = {
    ticker: resolved.ticker,
    market: resolved.market,
    name: nameHint ?? resolved.name,
    yahooSymbol: resolved.yahooSymbol,
  };

  let snapshot = await fetchMarketSnapshot(entry);
  if (!snapshot) {
    throw new Error(`Market data unavailable for ${tickerInput}`);
  }

  snapshot = await enrichMarketSnapshot(snapshot);

  const per = snapshot.peRatio ?? 20;
  const eps = snapshot.eps ?? (per > 0 ? snapshot.price / per : snapshot.price / 20);
  const lynch = analyzeLynch({
    price: snapshot.price,
    per,
    eps,
    epsGrowthPct: snapshot.epsGrowth ?? 12,
    divYield: snapshot.divYield ?? 0,
  });

  const greenblatt = analyzeGreenblatt({
    price: snapshot.price,
    eps,
    bps: snapshot.bps ?? eps * 5,
    marketCap: snapshot.marketCap ?? snapshot.price * 50_000_000,
    pbr: snapshot.pbr ?? 1.5,
  });

  const supply = {
    foreignNetAmount: snapshot.foreignNetAmount ?? null,
    institutionNetAmount: snapshot.institutionNetAmount ?? null,
    trend: snapshot.supplyTrend ?? "neutral",
    label:
      snapshot.market === "US"
        ? "US market — KR 수급(MCP) 미적용"
        : (snapshot.supplyLabel ?? "No supply data"),
  };

  const valuation = calculateValuation(snapshot);
  const news = await fetchNewsHeadlines(snapshot.ticker, snapshot.market, 5);
  const gemini = await geminiAnalyzeStock(snapshot, valuation, {
    news,
    geminiApiKey: options?.geminiApiKey,
  });
  const catalysts = [
    ...gemini.bull_catalysts,
    ...(gemini.news_takeaway ? [`News: ${gemini.news_takeaway}`] : []),
    ...gemini.bear_risks.map((r) => `Risk: ${r}`),
  ].slice(0, 5);

  const combinedRec = combinedRecommendation(lynch.recommendation, greenblatt.recommendation);

  const report: WallStreetReport = {
    ticker: snapshot.ticker,
    name: snapshot.name,
    market: snapshot.market,
    currency: snapshot.currency,
    price: snapshot.price,
    generatedAt: new Date().toISOString(),
    lynch: {
      fairValue: lynch.fairValue,
      pegRatio: lynch.pegRatio,
      dividendAdjustedPEG: lynch.dividendAdjustedPEG,
      lynchScore: lynch.lynchScore,
      companyType: lynch.companyType,
      recommendation: lynch.recommendation,
      upsidePct: lynch.upsidePct,
    },
    greenblatt: {
      fairValue: greenblatt.fairValue,
      roic: greenblatt.roic,
      earningsYield: greenblatt.earningsYield,
      magicScore: greenblatt.magicScore,
      comprehensiveScore: greenblatt.comprehensiveScore,
      investmentGrade: greenblatt.investmentGrade,
      recommendation: greenblatt.recommendation,
      upsidePct: greenblatt.upsidePct,
    },
    supply: {
      foreignNetAmount: supply.foreignNetAmount,
      institutionNetAmount: supply.institutionNetAmount,
      trend: supply.trend,
      label: supply.label,
    },
    combined: {
      fairValue: valuation.intrinsicValue,
      marginOfSafetyPct: valuation.marginOfSafetyPct,
      buyingZone: formatBuyingZone(
        valuation.buyingZoneLow,
        valuation.buyingZoneHigh,
        snapshot.currency,
      ),
      profitTarget: formatMoney(valuation.profitTarget, snapshot.currency),
      hardStop: formatMoney(valuation.hardStop, snapshot.currency),
      recommendation: combinedRec,
    },
    catalysts,
    rating: gemini.rating,
    technicalLabel: snapshot.technical?.label ?? "N/A",
  };

  return { snapshot, valuation, news, gemini, report };
}

export async function buildWallStreetReport(
  tickerInput: string,
  nameHint?: string,
  options?: { geminiApiKey?: string | null },
): Promise<WallStreetReport> {
  const ctx = await buildWallStreetReportContext(tickerInput, nameHint, options);
  return ctx.report;
}

function combinedRecommendation(lynch: string, greenblatt: string): string {
  const rank = (r: string) => {
    if (r === "Strong Buy") return 5;
    if (r === "Buy") return 4;
    if (r === "Hold") return 3;
    if (r === "Sell") return 2;
    return 1;
  };
  const avg = (rank(lynch) + rank(greenblatt)) / 2;
  if (avg >= 4.5) return "Strong Buy";
  if (avg >= 3.5) return "Buy";
  if (avg >= 2.5) return "Hold";
  if (avg >= 1.5) return "Sell";
  return "Strong Sell";
}

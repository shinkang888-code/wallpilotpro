import { canonicalTicker } from "@/lib/api/stock-search.server";
import {
  entryPriceKey,
  fetchLivePricesForEntries,
  type LivePrice,
  type MarketDataOptions,
} from "@/lib/market/price-provider.server";
import { computeTechnicalIndicators } from "@/lib/quant/technical.server";
import type { Market, RawMarketSnapshot } from "@/lib/types/stock";
import type { UniverseEntry } from "@/lib/quant/universe.server";

export type { MarketDataOptions };

function yahooSymbolCandidates(ticker: string, market: Market, override?: string): string[] {
  if (override) return [override];
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
    return [`${code}.KS`, `${code}.KQ`];
  }
  return [ticker.replace(/\./g, "-")];
}

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        longName?: string;
        shortName?: string;
        currency?: string;
      };
      indicators?: {
        quote?: Array<{
          volume?: (number | null)[];
          close?: (number | null)[];
        }>;
      };
    }>;
  };
};

type YahooSummary = {
  quoteSummary?: {
    result?: Array<{
      financialData?: {
        returnOnEquity?: { raw?: number };
        operatingMargins?: { raw?: number };
        currentPrice?: { raw?: number };
      };
      defaultKeyStatistics?: {
        trailingPE?: { raw?: number };
        pegRatio?: { raw?: number };
      };
      summaryDetail?: {
        trailingPE?: { raw?: number };
      };
    }>;
  };
};

export async function fetchMarketSnapshot(
  entry: UniverseEntry,
  options?: MarketDataOptions & { livePriceOverride?: LivePrice },
): Promise<RawMarketSnapshot | null> {
  let live = options?.livePriceOverride;
  if (!live) {
    const liveMap = await fetchLivePricesForEntries(
      [
        {
          ticker: entry.ticker,
          market: entry.market,
          yahooSymbol: entry.yahooSymbol,
        },
      ],
      options?.tossKey,
    );
    live = liveMap.get(entryPriceKey(entry.ticker, entry.market));
  }

  const candidates = yahooSymbolCandidates(entry.ticker, entry.market, entry.yahooSymbol);
  try {
    let chart: Awaited<ReturnType<typeof fetchYahooChart>> = null;
    let symbol = candidates[0];
    for (const sym of candidates) {
      chart = await fetchYahooChart(sym);
      if (chart?.meta?.regularMarketPrice) {
        symbol = sym;
        break;
      }
    }
    if (!chart?.meta?.regularMarketPrice && !live) return null;

    const summary = chart ? await fetchYahooSummary(symbol) : null;
    const yahooPrice = chart?.meta?.regularMarketPrice ?? 0;
    const price = live?.price ?? yahooPrice;
    const priceSource = live?.source ?? "yahoo";
    const resolvedTicker =
      entry.market === "KR"
        ? canonicalTicker(chart?.meta?.symbol ?? symbol, "KR")
        : canonicalTicker(chart?.meta?.symbol ?? entry.ticker, "US");
    const volumes = chart?.volumes.filter((v): v is number => v != null && v > 0) ?? [];
    const closes = chart?.closes.filter((c): c is number => c != null && c > 0) ?? [];
    const volume = volumes.at(-1) ?? 0;
    const avgVolume20d =
      volumes.length > 0 ? volumes.reduce((a, b) => a + b, 0) / volumes.length : volume;
    const change30dPct = compute30dChange(closes.length > 0 ? closes : [price]);
    const technical = computeTechnicalIndicators({ closes: closes.length > 0 ? closes : [price], price });

    const fin = summary?.financialData;
    const stats = summary?.defaultKeyStatistics;
    const roe = fin?.returnOnEquity?.raw != null ? fin.returnOnEquity.raw * 100 : null;
    const operatingMargin =
      fin?.operatingMargins?.raw != null ? fin.operatingMargins.raw * 100 : null;
    const peRatio =
      stats?.trailingPE?.raw ?? summary?.summaryDetail?.trailingPE?.raw ?? null;
    const pegRatio = stats?.pegRatio?.raw ?? null;
    const epsGrowth = pegRatio && peRatio && pegRatio > 0 ? peRatio / pegRatio : 15;

    return {
      ticker: resolvedTicker,
      name: chart?.meta?.longName ?? chart?.meta?.shortName ?? entry.name,
      market: entry.market,
      currency: entry.market === "KR" ? "KRW" : "USD",
      price,
      priceSource,
      change30dPct,
      volume,
      avgVolume20d,
      peRatio,
      roe,
      operatingMargin,
      epsGrowth,
      cashToMcap: roe != null && roe > 20 ? 0.2 : 0.05,
      technical,
    };
  } catch {
    return null;
  }
}

export async function fetchMarketBatch(
  entries: UniverseEntry[],
  options?: MarketDataOptions,
): Promise<RawMarketSnapshot[]> {
  const liveMap = await fetchLivePricesForEntries(
    entries.map((e) => ({
      ticker: e.ticker,
      market: e.market,
      yahooSymbol: e.yahooSymbol,
    })),
    options?.tossKey,
  );

  const results = await Promise.all(
    entries.map((e) =>
      fetchMarketSnapshot(e, {
        tossKey: options?.tossKey,
        livePriceOverride: liveMap.get(entryPriceKey(e.ticker, e.market)),
      }),
    ),
  );
  return results.filter((r): r is RawMarketSnapshot => r != null);
}

async function fetchYahooChart(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=3mo`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as YahooChart;
  const result = json.chart?.result?.[0];
  const meta = result?.meta;
  const quote = result?.indicators?.quote?.[0];
  return {
    meta,
    volumes: quote?.volume ?? [],
    closes: quote?.close ?? [],
  };
}

async function fetchYahooSummary(symbol: string) {
  const modules = "financialData,defaultKeyStatistics,summaryDetail";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" },
  });
  if (!res.ok) return null;
  const json = (await res.json()) as YahooSummary;
  return json.quoteSummary?.result?.[0] ?? null;
}

function compute30dChange(closes: number[]): number {
  if (closes.length < 2) return 0;
  const recent = closes.at(-1)!;
  const idx = Math.max(0, closes.length - 22);
  const past = closes[idx] ?? closes[0];
  if (!past) return 0;
  return ((recent - past) / past) * 100;
}

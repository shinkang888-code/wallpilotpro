import { resolveStockInput } from "@/lib/api/stock-search.server";
import { fetchLivePrice, type MarketDataOptions } from "@/lib/market/price-provider.server";
import type { ChartInterval, ChartPoint, StockChartSeries } from "@/lib/types/chart";
import type { Market } from "@/lib/types/stock";

const UA = { "User-Agent": "Mozilla/5.0 WallPilot/1.0" };

const INTERVAL_CONFIG: Record<ChartInterval, { interval: string; range: string }> = {
  "1d": { interval: "1d", range: "3mo" },
  "1wk": { interval: "1wk", range: "2y" },
  "1mo": { interval: "1mo", range: "5y" },
};

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; currency?: string };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          close?: (number | null)[];
          volume?: (number | null)[];
        }>;
      };
    }>;
  };
};

function yahooCandidates(ticker: string, market: Market): string[] {
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
    return [`${code}.KS`, `${code}.KQ`];
  }
  return [ticker.replace(/\./g, "-")];
}

export async function fetchStockChartSeries(
  tickerInput: string,
  market: Market,
  interval: ChartInterval,
  options?: MarketDataOptions,
): Promise<StockChartSeries> {
  const resolved = await resolveStockInput(tickerInput);
  const cfg = INTERVAL_CONFIG[interval];
  const candidates = resolved.yahooSymbol
    ? [resolved.yahooSymbol]
    : yahooCandidates(resolved.ticker, market);

  let points: ChartPoint[] = [];
  let lastPrice = 0;
  let currency: "KRW" | "USD" = resolved.market === "KR" ? "KRW" : "USD";

  for (const symbol of candidates) {
    const series = await fetchYahooSeries(symbol, cfg.interval, cfg.range);
    if (series.points.length > 0) {
      points = series.points;
      lastPrice = series.lastPrice;
      break;
    }
  }

  if (points.length === 0) {
    throw new Error(`Chart data unavailable for ${tickerInput}`);
  }

  const live = await fetchLivePrice(resolved.ticker, resolved.market, {
    tossKey: options?.tossKey,
    yahooSymbol: resolved.yahooSymbol,
  });
  const last = live?.price ?? (lastPrice || points.at(-1)!.close);

  return {
    ticker: resolved.ticker,
    name: resolved.name,
    currency,
    interval,
    points,
    lastPrice: last,
    priceSource: live?.source,
  };
}

/** Last 3 months daily OHLCV for strategy engine. */
export async function fetchDailyVolumeSeries(
  tickerInput: string,
  market: Market,
  options?: MarketDataOptions,
): Promise<ChartPoint[]> {
  const series = await fetchStockChartSeries(tickerInput, market, "1d", options);
  return series.points;
}

async function fetchYahooSeries(
  symbol: string,
  interval: string,
  range: string,
): Promise<{ points: ChartPoint[]; lastPrice: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return { points: [], lastPrice: 0 };
    const json = (await res.json()) as YahooChart;
    const result = json.chart?.result?.[0];
    if (!result?.timestamp?.length) return { points: [], lastPrice: 0 };

    const closes = result.indicators?.quote?.[0]?.close ?? [];
    const volumes = result.indicators?.quote?.[0]?.volume ?? [];
    const points: ChartPoint[] = [];

    for (let i = 0; i < result.timestamp.length; i++) {
      const close = closes[i];
      const vol = volumes[i];
      if (close == null || close <= 0) continue;
      points.push({
        date: new Date(result.timestamp[i]! * 1000).toISOString().slice(0, 10),
        close,
        volume: vol != null && vol > 0 ? vol : 0,
      });
    }

    const lastPrice = result.meta?.regularMarketPrice ?? points.at(-1)?.close ?? 0;
    return { points, lastPrice };
  } catch {
    return { points: [], lastPrice: 0 };
  }
}

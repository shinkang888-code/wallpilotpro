import { canonicalTicker } from "@/lib/api/stock-search.server";
import { getServerConfig } from "@/lib/config.server";
import {
  getTossAccessToken,
  getTossBearerToken,
  resolveTossCredentials,
} from "@/lib/market/toss-auth.server";
import type { Market } from "@/lib/types/stock";

export type PriceSource = "toss" | "yahoo";

export type LivePrice = {
  price: number;
  currency: "KRW" | "USD";
  source: PriceSource;
  timestamp?: string;
};

export type MarketDataOptions = {
  tossKey?: string | null;
};

const UA = { "User-Agent": "Mozilla/5.0 WallPilot/1.0" };

export function entryPriceKey(ticker: string, market: Market): string {
  return `${market}:${canonicalTicker(ticker, market)}`;
}

export function toTossSymbol(ticker: string, market: Market): string {
  if (market === "KR") {
    return ticker.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
  }
  return ticker.replace(/\./g, "-").toUpperCase();
}

function yahooSymbolCandidates(
  ticker: string,
  market: Market,
  override?: string,
): string[] {
  if (override) return [override];
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
    return [`${code}.KS`, `${code}.KQ`];
  }
  return [ticker.replace(/\./g, "-")];
}

type TossPriceRow = {
  symbol?: string;
  lastPrice?: string;
  currency?: string;
  timestamp?: string;
};

async function fetchTossPricesBySymbols(
  symbols: string[],
  tossKey?: string | null,
): Promise<Map<string, LivePrice>> {
  const out = new Map<string, LivePrice>();
  if (symbols.length === 0) return out;

  const creds = resolveTossCredentials(tossKey);
  if (!creds) return out;

  const token = await getTossAccessToken(creds);
  if (!token) return out;

  const { tossApiBaseUrl } = getServerConfig();
  const unique = [...new Set(symbols)];

  for (let i = 0; i < unique.length; i += 200) {
    const chunk = unique.slice(i, i + 200);
    const url = `${tossApiBaseUrl}/api/v1/prices?symbols=${encodeURIComponent(chunk.join(","))}`;
    try {
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as { result?: TossPriceRow[] };
      for (const row of json.result ?? []) {
        if (!row.symbol || !row.lastPrice) continue;
        const price = Number.parseFloat(row.lastPrice);
        if (!Number.isFinite(price) || price <= 0) continue;
        out.set(row.symbol.toUpperCase(), {
          price,
          currency: row.currency === "USD" ? "USD" : "KRW",
          source: "toss",
          timestamp: row.timestamp,
        });
      }
    } catch {
      /* try next chunk */
    }
  }

  return out;
}

type YahooChartMeta = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number; currency?: string };
    }>;
  };
};

/** Single-symbol Yahoo live price (fallback). */
export async function fetchYahooLivePrice(
  ticker: string,
  market: Market,
  yahooSymbolOverride?: string,
): Promise<LivePrice | null> {
  const candidates = yahooSymbolCandidates(ticker, market, yahooSymbolOverride);
  for (const symbol of candidates) {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
    try {
      const res = await fetch(url, {
        headers: UA,
        signal: AbortSignal.timeout(12_000),
      });
      if (!res.ok) continue;
      const json = (await res.json()) as YahooChartMeta;
      const price = json.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (price == null || price <= 0) continue;
      const currency =
        json.chart?.result?.[0]?.meta?.currency === "KRW" || market === "KR"
          ? "KRW"
          : "USD";
      return { price, currency, source: "yahoo" };
    } catch {
      /* next candidate */
    }
  }
  return null;
}

/** Toss-first live price for one ticker; Yahoo when Toss is unavailable. */
export async function fetchLivePrice(
  ticker: string,
  market: Market,
  options?: MarketDataOptions & { yahooSymbol?: string },
): Promise<LivePrice | null> {
  const tossSym = toTossSymbol(ticker, market);
  const tossMap = await fetchTossPricesBySymbols([tossSym], options?.tossKey);
  const tossHit = tossMap.get(tossSym.toUpperCase());
  if (tossHit) return tossHit;
  return fetchYahooLivePrice(ticker, market, options?.yahooSymbol);
}

export type PriceEntryInput = {
  ticker: string;
  market: Market;
  yahooSymbol?: string;
};

/** Batch live prices — Toss bulk API first, Yahoo per missing symbol. */
export async function fetchLivePricesForEntries(
  entries: PriceEntryInput[],
  tossKey?: string | null,
): Promise<Map<string, LivePrice>> {
  const result = new Map<string, LivePrice>();
  if (entries.length === 0) return result;

  const symbolToKey = new Map<string, string>();
  const tossSymbols: string[] = [];
  for (const e of entries) {
    const sym = toTossSymbol(e.ticker, e.market);
    symbolToKey.set(sym.toUpperCase(), entryPriceKey(e.ticker, e.market));
    tossSymbols.push(sym);
  }

  const tossMap = await fetchTossPricesBySymbols(tossSymbols, tossKey);
  for (const [sym, key] of symbolToKey) {
    const hit = tossMap.get(sym);
    if (hit) result.set(key, hit);
  }

  const missing = entries.filter(
    (e) => !result.has(entryPriceKey(e.ticker, e.market)),
  );
  await Promise.all(
    missing.map(async (e) => {
      const yahoo = await fetchYahooLivePrice(e.ticker, e.market, e.yahooSymbol);
      if (yahoo) result.set(entryPriceKey(e.ticker, e.market), yahoo);
    }),
  );

  return result;
}

export { getTossBearerToken };

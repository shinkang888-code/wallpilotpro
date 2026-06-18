import { getServerConfig } from "@/lib/config.server";
import { lookupKrStockByCorpName, searchKrStocksByCorpName } from "@/lib/modules/dart/corp-code.server";
import type { Market } from "@/lib/types/stock";
import type { StockSearchResult } from "@/lib/types/search";

export type { StockSearchResult } from "@/lib/types/search";
export type ResolvedStock = StockSearchResult;

const UA = { "User-Agent": "Mozilla/5.0 WallPilot/1.0" };
const US_EXCHANGES = new Set(["NMS", "NYQ", "NGM", "NCM", "ASE", "PCX", "BTS", "CBO"]);

type YahooSearchResponse = {
  quotes?: Array<{
    symbol?: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchange?: string;
  }>;
};

/** KR/US 종목 검색 — Yahoo Finance search API. */
export async function searchStocks(query: string, limit = 12): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (q.length < 1) return [];

  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return fmpSearchStocks(q, limit);
    const json = (await res.json()) as YahooSearchResponse;
    const yahoo = (json.quotes ?? [])
      .filter((row) => row.symbol && (row.quoteType === "EQUITY" || row.quoteType === "ETF"))
      .map((row) => mapYahooQuote(row.symbol!, row.longname ?? row.shortname ?? row.symbol!, row.exchange ?? ""))
      .filter((r): r is StockSearchResult => r != null);
    if (yahoo.length > 0) return yahoo.slice(0, limit);
    return fmpSearchStocks(q, limit);
  } catch {
    return fmpSearchStocks(q, limit);
  }
}

async function fmpSearchStocks(query: string, limit: number): Promise<StockSearchResult[]> {
  const { fmpApiKey } = getServerConfig();
  if (!fmpApiKey) return [];
  const url = `https://financialmodelingprep.com/stable/search-symbol?query=${encodeURIComponent(query)}&apikey=${fmpApiKey}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return [];
    const json = (await res.json()) as Array<{
      symbol?: string;
      name?: string;
      exchangeShortName?: string;
      stockExchange?: string;
    }>;
    return json
      .map((row) => {
        if (!row.symbol || !row.name) return null;
        return mapYahooQuote(row.symbol, row.name, row.exchangeShortName ?? row.stockExchange ?? "");
      })
      .filter((r): r is StockSearchResult => r != null)
      .slice(0, limit);
  } catch {
    return [];
  }
}

/** KR listed stocks only — for DARTLAB / OpenDART. */
export async function searchKrStocks(query: string, limit = 12): Promise<StockSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { opendartApiKey } = getServerConfig();
  const byName = await searchKrStocksByCorpName(q, opendartApiKey, limit);
  if (byName.length > 0) {
    return Promise.all(byName.map((hit) => buildKrStockResult(hit.stockCode, hit.corpName)));
  }

  const yahoo = (await searchStocks(q, limit)).filter((row) => row.market === "KR");
  return yahoo.slice(0, limit);
}

/** KR listed stocks only — for DARTLAB / OpenDART. */
export async function resolveKrStockInput(input: string): Promise<StockSearchResult> {
  const raw = input.trim();
  if (!raw) throw new Error("dart_invalid_code");

  const direct = parseDirectTicker(raw);
  if (direct?.market === "KR") {
    const verified = await verifyYahooSymbol(direct.yahooSymbol, "KR");
    if (verified) {
      return {
        ...direct,
        name: verified.name ?? direct.name,
        yahooSymbol: verified.yahooSymbol,
      };
    }
  }

  const { opendartApiKey } = getServerConfig();
  const hasHangul = /[\uAC00-\uD7A3]/.test(raw);
  if (hasHangul || !/^\d+$/.test(raw)) {
    const byName = await lookupKrStockByCorpName(raw, opendartApiKey);
    if (byName) return buildKrStockResult(byName.stockCode, byName.corpName);
  }

  try {
    const resolved = await resolveStockInput(raw);
    if (resolved.market !== "KR") throw new Error("dart_kr_only");
    return resolved;
  } catch (e) {
    const byName = await lookupKrStockByCorpName(raw, opendartApiKey);
    if (byName) return buildKrStockResult(byName.stockCode, byName.corpName);
    if (e instanceof Error && e.message === "dart_kr_only") throw e;
    throw new Error("dart_invalid_code");
  }
}

async function buildKrStockResult(stockCode: string, corpName: string): Promise<StockSearchResult> {
  for (const suffix of [".KS", ".KQ"] as const) {
    const sym = `${stockCode}${suffix}`;
    const verified = await verifyYahooSymbol(sym, "KR");
    if (verified) {
      return {
        ticker: stockCode,
        name: corpName || verified.name || stockCode,
        market: "KR",
        yahooSymbol: verified.yahooSymbol,
        exchange: suffix === ".KQ" ? "KOE" : "KSC",
      };
    }
  }
  return {
    ticker: stockCode,
    name: corpName,
    market: "KR",
    yahooSymbol: `${stockCode}.KS`,
    exchange: "KSC",
  };
}

/** 종목코드·티커·회사명 → canonical ticker + Yahoo symbol. */
export async function resolveStockInput(input: string): Promise<ResolvedStock> {
  const raw = input.trim();
  if (!raw) throw new Error("종목 코드 또는 티커를 입력하세요.");

  const direct = parseDirectTicker(raw);
  if (direct) {
    const verified = await verifyYahooSymbol(direct.yahooSymbol, direct.market);
    if (verified) {
      return {
        ...direct,
        name: verified.name ?? direct.name,
        yahooSymbol: verified.yahooSymbol,
      };
    }
  }

  const results = await searchStocks(raw, 8);
  if (results.length === 0) {
    throw new Error(`「${raw}」에 해당하는 종목을 찾을 수 없습니다.`);
  }

  const exact = pickBestMatch(raw, results);
  const verified = await verifyYahooSymbol(exact.yahooSymbol, exact.market);
  if (!verified) throw new Error(`「${raw}」 시세 데이터를 가져올 수 없습니다.`);

  return {
    ...exact,
    name: verified.name ?? exact.name,
    yahooSymbol: verified.yahooSymbol,
    ticker: canonicalTicker(verified.yahooSymbol, exact.market),
  };
}

function parseDirectTicker(raw: string): ResolvedStock | null {
  const upper = raw.toUpperCase().trim();
  const krSuffix = upper.match(/^(\d{6})\.(KS|KQ)$/);
  if (krSuffix) {
    const code = krSuffix[1];
    return {
      ticker: code,
      name: code,
      market: "KR",
      yahooSymbol: `${code}.${krSuffix[2]}`,
      exchange: krSuffix[2] === "KQ" ? "KOE" : "KSC",
    };
  }
  if (/^\d{6}$/.test(upper)) {
    return {
      ticker: upper,
      name: upper,
      market: "KR",
      yahooSymbol: `${upper}.KS`,
      exchange: "KSC",
    };
  }
  if (/^[A-Z][A-Z0-9.\-]{0,9}$/.test(upper)) {
    const yahoo = upper.replace(/\./g, "-");
    return {
      ticker: upper.replace(/-/g, "."),
      name: upper,
      market: "US",
      yahooSymbol: yahoo,
      exchange: "NMS",
    };
  }
  return null;
}

function pickBestMatch(query: string, results: StockSearchResult[]): StockSearchResult {
  const q = query.trim().toLowerCase();
  const qUpper = query.trim().toUpperCase();

  for (const r of results) {
    if (r.ticker === qUpper || r.yahooSymbol.toUpperCase() === qUpper) return r;
    if (r.name.toLowerCase() === q) return r;
  }
  for (const r of results) {
    if (r.name.toLowerCase().includes(q) || r.ticker.includes(qUpper)) return r;
  }
  return results[0];
}

function mapYahooQuote(symbol: string, name: string, exchange: string): StockSearchResult | null {
  const market = inferMarket(symbol, exchange);
  if (!market) return null;
  return {
    ticker: canonicalTicker(symbol, market),
    name,
    market,
    yahooSymbol: symbol,
    exchange,
  };
}

function inferMarket(symbol: string, exchange: string): Market | null {
  if (/\.(HK|L|TO|AX|PA|DE|T|SS|SZ)$/i.test(symbol)) return null;
  if (/\.KS$|\.KQ$/i.test(symbol)) return "KR";
  if (/^\d{6}(\.|$)/.test(symbol)) return "KR";
  const krEx = new Set(["KSC", "KOE", "KRX", "KOR", "KOSPI", "KOSDAQ"]);
  if (krEx.has(exchange.toUpperCase())) return "KR";
  if (/^[A-Z][A-Z0-9.\-]*$/.test(symbol) && !symbol.includes(".")) return "US";
  if (US_EXCHANGES.has(exchange.toUpperCase())) return "US";
  return null;
}

export function canonicalTicker(yahooSymbol: string, market: Market): string {
  if (market === "KR") {
    return yahooSymbol.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
  }
  return yahooSymbol.replace(/-/g, ".").replace(/\.(US|NASDAQ|NYSE)$/i, "");
}

async function verifyYahooSymbol(
  symbol: string,
  market: Market,
): Promise<{ yahooSymbol: string; name: string | null } | null> {
  if (market === "KR") {
    const code = symbol.replace(/\.KS$|\.KQ$/i, "");
    for (const suffix of [".KS", ".KQ"] as const) {
      const sym = `${code}${suffix}`;
      const hit = await fetchYahooChartMeta(sym);
      if (hit) return { yahooSymbol: sym, name: hit.name };
    }
    return null;
  }
  const sym = symbol.replace(/\./g, "-");
  const hit = await fetchYahooChartMeta(sym);
  return hit ? { yahooSymbol: sym, name: hit.name } : null;
}

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        symbol?: string;
        regularMarketPrice?: number;
        longName?: string;
        shortName?: string;
      };
    }>;
  };
};

async function fetchYahooChartMeta(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChart;
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return {
      name: meta.longName ?? meta.shortName ?? null,
      symbol: meta.symbol ?? symbol,
    };
  } catch {
    return null;
  }
}

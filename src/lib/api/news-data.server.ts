import { getServerConfig } from "@/lib/config.server";
import type { Market } from "@/lib/types/stock";

export type NewsHeadline = {
  title: string;
  source: string;
  summary: string;
  publishedAt: string | null;
};

function yahooSymbol(ticker: string, market: Market): string {
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/, "");
    return `${code}.KS`;
  }
  return ticker.replace(".", "-");
}

/**
 * News Analyst layer — Alpha Vantage NEWS_SENTIMENT (TradingAgents)
 * with Yahoo Finance search fallback (yfinance_news pattern).
 */
export async function fetchNewsHeadlines(
  ticker: string,
  market: Market,
  limit = 5,
): Promise<NewsHeadline[]> {
  const fromAv = await fetchAlphaVantageNews(ticker, market, limit);
  if (fromAv.length > 0) return fromAv;
  return fetchYahooNewsHeadlines(ticker, market, limit);
}

async function fetchAlphaVantageNews(
  ticker: string,
  market: Market,
  limit: number,
): Promise<NewsHeadline[]> {
  const { alphaVantageApiKey } = getServerConfig();
  if (!alphaVantageApiKey) return [];

  const symbol = marketAvantageSymbol(ticker, market);
  const url = new URL("https://www.alphavantage.co/query");
  url.searchParams.set("function", "NEWS_SENTIMENT");
  url.searchParams.set("tickers", symbol);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("apikey", alphaVantageApiKey);

  try {
    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      feed?: Array<{
        title?: string;
        source?: string;
        summary?: string;
        time_published?: string;
      }>;
    };
    return (json.feed ?? []).slice(0, limit).map((item) => ({
      title: item.title ?? "Untitled",
      source: item.source ?? "Unknown",
      summary: (item.summary ?? "").slice(0, 280),
      publishedAt: parseAvDate(item.time_published),
    }));
  } catch {
    return [];
  }
}

async function fetchYahooNewsHeadlines(
  ticker: string,
  market: Market,
  limit: number,
): Promise<NewsHeadline[]> {
  const symbol = yahooSymbol(ticker, market);
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&newsCount=${limit}&quotesCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      news?: Array<{
        title?: string;
        publisher?: string;
        summary?: string;
        providerPublishTime?: number;
      }>;
    };
    return (json.news ?? []).slice(0, limit).map((n) => ({
      title: n.title ?? "Untitled",
      source: n.publisher ?? "Yahoo",
      summary: (n.summary ?? "").slice(0, 280),
      publishedAt: n.providerPublishTime
        ? new Date(n.providerPublishTime * 1000).toISOString()
        : null,
    }));
  } catch {
    return [];
  }
}

function marketAvantageSymbol(ticker: string, market: Market): string {
  if (market === "KR") return ticker.replace(/\.KS$|\.KQ$/, "");
  return ticker;
}

function parseAvDate(raw: string | undefined): string | null {
  if (!raw || raw.length < 8) return null;
  const y = raw.slice(0, 4);
  const m = raw.slice(4, 6);
  const d = raw.slice(6, 8);
  return `${y}-${m}-${d}`;
}

export function formatNewsForPrompt(headlines: NewsHeadline[]): string {
  if (headlines.length === 0) return "No recent headlines available.";
  return headlines
    .map((h, i) => `${i + 1}. [${h.source}] ${h.title}${h.summary ? ` — ${h.summary}` : ""}`)
    .join("\n");
}

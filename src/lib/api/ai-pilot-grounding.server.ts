import { fetchMarketSnapshot } from "@/lib/api/market-data.server";
import { resolveStockInput, searchStocks } from "@/lib/api/stock-search.server";
import { buildUniverse } from "@/lib/quant/universe.server";
import type { RawMarketSnapshot, StockRow } from "@/lib/types/stock";

/** Static lookup of common KR/US company aliases → ticker.
 * Yahoo Finance search rejects Korean queries, so we need an in-app fallback. */
const NAME_INDEX: Array<{ name: string; ticker: string; market: "KR" | "US"; yahooSymbol: string }> = (() => {
  const seen = new Map<string, { name: string; ticker: string; market: "KR" | "US"; yahooSymbol: string }>();
  for (const u of buildUniverse({ toss: true, thirteenF: true, quant: true })) {
    const yahoo =
      u.yahooSymbol ?? (u.market === "KR" ? `${u.ticker}.KS` : u.ticker.replace(/\./g, "-"));
    seen.set(u.name.toLowerCase(), { name: u.name, ticker: u.ticker, market: u.market, yahooSymbol: yahoo });
    seen.set(u.ticker.toLowerCase(), { name: u.name, ticker: u.ticker, market: u.market, yahooSymbol: yahoo });
  }
  // Extra Korean aliases not in the universe yet
  const extras: Array<[string, string, "KR" | "US"]> = [
    ["LG전자", "066570", "KR"],
    ["포스코", "005490", "KR"],
    ["POSCO", "005490", "KR"],
    ["셀트리온", "068270", "KR"],
    ["엔비디아", "NVDA", "US"],
    ["테슬라", "TSLA", "US"],
    ["애플", "AAPL", "US"],
    ["구글", "GOOGL", "US"],
    ["마이크로소프트", "MSFT", "US"],
    ["메타", "META", "US"],
    ["아마존", "AMZN", "US"],
  ];
  for (const [name, ticker, market] of extras) {
    const yahoo = market === "KR" ? `${ticker}.KS` : ticker;
    seen.set(name.toLowerCase(), { name, ticker, market, yahooSymbol: yahoo });
  }
  return [...seen.values()];
})();

function lookupName(token: string): { ticker: string; market: "KR" | "US"; yahooSymbol: string; name: string } | null {
  const k = token.toLowerCase();
  for (const e of NAME_INDEX) {
    if (e.name.toLowerCase() === k || e.ticker.toLowerCase() === k) return e;
  }
  // partial: token included in indexed name (e.g. "삼성전자" contained in "삼성전자보통주")
  for (const e of NAME_INDEX) {
    if (k.length >= 2 && e.name.toLowerCase().includes(k)) return e;
  }
  return null;
}



/** Live market data fetched for tickers/companies mentioned by the user. */
export type GroundedQuote = {
  ticker: string;
  name: string;
  market: "KR" | "US";
  currency: "KRW" | "USD";
  price: number;
  change30dPct: number;
  peRatio: number | null;
  roe: number | null;
  operatingMargin: number | null;
  volume: number;
  avgVolume20d: number;
};

const KO_STOPWORDS = new Set([
  "오늘", "지금", "종목", "주식", "시장", "매수", "매도", "분석", "추천",
  "단기", "장기", "상승", "하락", "순서", "순위", "랭킹", "전망", "보여줘",
  "알려줘", "어때", "어떻게", "얼마", "가격", "목표", "진입", "손절", "현재",
  "최근", "코스피", "코스닥", "미국", "국내", "한국", "시세", "주가", "회사",
  "기업", "이름", "정보", "리포트", "전략", "위험", "기준", "대해", "관련",
  "어떤", "무엇", "어디", "언제", "왜", "그리고", "그래서", "그러나",
]);

const EN_STOPWORDS = new Set([
  "STOCK", "PRICE", "TARGET", "ENTRY", "STOP", "BUY", "SELL", "HOLD",
  "ANALYZE", "ANALYSIS", "RECOMMEND", "RATING", "SHORT", "LONG", "TERM",
  "RANK", "ORDER", "TOP", "BEST", "PICK", "PICKS", "MARKET", "NASDAQ",
  "NYSE", "KOSPI", "KOSDAQ", "WHAT", "HOW", "WHEN", "WHY", "WHERE",
  "ABOUT", "REPORT", "STRATEGY", "PLEASE", "TELL", "SHOW", "GIVE",
  "WITH", "FROM", "FOR", "AND", "THE", "INTO", "AGAINST", "BETWEEN",
]);

function tokenize(text: string): string[] {
  // Split on whitespace + punctuation that is NOT inside tickers (keep . and -)
  const parts = text.split(/[\s,?!:;()\[\]{}"'`~@#$%^&*+=|\\/<>]+/u);
  const out: string[] = [];
  const push = (raw: string) => {
    if (!raw) return;
    if (/^\d{6}$/.test(raw)) out.push(raw);
    else if (/^[A-Za-z][A-Za-z0-9.\-]{0,9}$/.test(raw)) out.push(raw.toUpperCase());
    else if (/^[\p{Script=Hangul}]{2,12}$/u.test(raw)) out.push(raw);
  };
  for (const raw of parts) {
    if (!raw) continue;
    // Split mixed Hangul+Latin tokens (e.g. "AAPL도", "삼성전자는")
    const mixed = raw.match(/[\p{Script=Hangul}]+|[A-Za-z][A-Za-z0-9.\-]*|\d{6}/gu);
    if (mixed) mixed.forEach(push);
    else push(raw);
  }
  return out;
}

function isCandidate(token: string): boolean {
  if (/^\d{6}$/.test(token)) return true;
  if (/^[A-Z][A-Z0-9.\-]{0,9}$/.test(token)) {
    if (EN_STOPWORDS.has(token)) return false;
    return true;
  }
  if (KO_STOPWORDS.has(token)) return false;
  if (/^[\p{Script=Hangul}]{2,12}$/u.test(token)) return true;
  return false;
}

/** Resolve candidate tokens to real tickers (best-effort, parallel). */
async function resolveCandidates(
  tokens: string[],
  maxResolved: number,
): Promise<Array<{ ticker: string; market: "KR" | "US"; yahooSymbol: string; name: string }>> {
  const unique = Array.from(new Set(tokens.filter(isCandidate))).slice(0, 8);
  if (unique.length === 0) return [];

  const settled = await Promise.all(
    unique.map(async (tok) => {
      // 1) Static name index (handles Korean since Yahoo blocks Korean search)
      const indexed = lookupName(tok);
      if (indexed) return indexed;
      try {
        // 2) Direct ticker shortcut (6-digit KR or US symbol)
        if (/^\d{6}$/.test(tok) || /^[A-Z][A-Z0-9.\-]{0,9}$/.test(tok)) {
          return await resolveStockInput(tok);
        }
        // 3) Fallback to Yahoo search (works for English names)
        const results = await searchStocks(tok, 3);
        if (results.length === 0) return null;
        return results[0];
      } catch {
        return null;
      }
    }),
  );

  const seen = new Set<string>();
  const out: Array<{ ticker: string; market: "KR" | "US"; yahooSymbol: string; name: string }> = [];
  for (const r of settled) {
    if (!r) continue;
    const key = `${r.market}:${r.ticker}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
    if (out.length >= maxResolved) break;
  }
  return out;
}

function snapshotToGrounded(s: RawMarketSnapshot): GroundedQuote {
  return {
    ticker: s.ticker,
    name: s.name,
    market: s.market,
    currency: s.currency,
    price: s.price,
    change30dPct: s.change30dPct,
    peRatio: s.peRatio,
    roe: s.roe,
    operatingMargin: s.operatingMargin,
    volume: s.volume,
    avgVolume20d: s.avgVolume20d,
  };
}

/** Pull live market data for any company mentioned in the latest user message. */
export async function fetchGroundedQuotes(
  latestUserMessage: string,
  scanContext?: { shortSqueeze: StockRow[]; highCash: StockRow[] } | null,
  maxQuotes = 4,
): Promise<GroundedQuote[]> {
  const tokens = tokenize(latestUserMessage);

  // "위 종목/그 종목" → reuse scanContext tickers
  const refersToPrev = /위\s*종목|그\s*종목|those|above/i.test(latestUserMessage);
  if (refersToPrev && scanContext) {
    const rows = [...scanContext.shortSqueeze, ...scanContext.highCash];
    rows.slice(0, 4).forEach((r) => tokens.push(r.ticker));
  }

  const resolved = await resolveCandidates(tokens, maxQuotes);
  if (resolved.length === 0) return [];

  const snapshots = await Promise.all(
    resolved.map((r) =>
      fetchMarketSnapshot({
        ticker: r.ticker,
        market: r.market,
        name: r.name,
        yahooSymbol: r.yahooSymbol,
      }).catch(() => null),
    ),
  );

  return snapshots
    .filter((s): s is RawMarketSnapshot => s != null)
    .map(snapshotToGrounded);
}

function fmtPrice(q: GroundedQuote): string {
  const n = q.price;
  if (q.currency === "KRW") return `${Math.round(n).toLocaleString("ko-KR")}원`;
  return `$${n.toFixed(2)}`;
}

function fmtPct(v: number | null): string {
  if (v == null) return "n/a";
  return `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`;
}

/** Render an authoritative live-data block to inject into the user turn. */
export function renderGroundedBlock(quotes: GroundedQuote[]): string {
  if (quotes.length === 0) return "";
  const lines = quotes.map((q) => {
    const pe = q.peRatio != null ? q.peRatio.toFixed(1) : "n/a";
    const roe = q.roe != null ? `${q.roe.toFixed(1)}%` : "n/a";
    const om = q.operatingMargin != null ? `${q.operatingMargin.toFixed(1)}%` : "n/a";
    const volRatio = q.avgVolume20d > 0 ? (q.volume / q.avgVolume20d).toFixed(2) + "x" : "n/a";
    return `- ${q.name} (${q.ticker} · ${q.market}) — price ${fmtPrice(q)} · 30D ${fmtPct(q.change30dPct)} · PER ${pe} · ROE ${roe} · OPM ${om} · vol ${volRatio} 20D-avg`;
  });
  return `\n\n### Live market data (authoritative — Yahoo Finance, fetched just now)
You MUST use the EXACT prices below for any ticker that appears here. Do NOT invent or
estimate prices, PER, ROE, or 30D change for these names. If a number is "n/a",
say so instead of guessing. Entry bands / stop / target you derive must reference
the live price.

${lines.join("\n")}`;
}

/* ============================================================
 *  DEEP STOCK PROFILE (single-ticker "주가분석" intent)
 * ============================================================ */

export type DeepStockProfile = {
  quote: GroundedQuote;
  high52w: number | null;
  low52w: number | null;
  marketCap: number | null;
  targetMean: number | null;
  targetHigh: number | null;
  targetLow: number | null;
  numAnalysts: number | null;
  recommendationKey: string | null;
  closes6mo: number[];
};

type YahooDeepSummary = {
  quoteSummary?: {
    result?: Array<{
      summaryDetail?: {
        fiftyTwoWeekHigh?: { raw?: number };
        fiftyTwoWeekLow?: { raw?: number };
        marketCap?: { raw?: number };
      };
      financialData?: {
        targetMeanPrice?: { raw?: number };
        targetHighPrice?: { raw?: number };
        targetLowPrice?: { raw?: number };
        numberOfAnalystOpinions?: { raw?: number };
        recommendationKey?: string;
      };
      price?: {
        marketCap?: { raw?: number };
      };
    }>;
  };
};

type YahooDeepResult = NonNullable<NonNullable<YahooDeepSummary["quoteSummary"]>["result"]>[number];

async function fetchYahooDeepSummary(symbol: string): Promise<YahooDeepResult | null> {
  const modules = "summaryDetail,financialData,price";
  const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(symbol)}?modules=${modules}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" } });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooDeepSummary;
    return json.quoteSummary?.result?.[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchYahooSixMonthCloses(symbol: string): Promise<number[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=6mo`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" } });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      chart?: { result?: Array<{ indicators?: { quote?: Array<{ close?: (number | null)[] }> } }> };
    };
    const closes = json.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    return closes.filter((c): c is number => c != null && c > 0);
  } catch {
    return [];
  }
}

/** Hydrate a single grounded quote with 52w range, analyst targets, and 6mo closes. */
export async function fetchDeepStockProfile(quote: GroundedQuote): Promise<DeepStockProfile | null> {
  const symbol =
    quote.market === "KR" ? `${quote.ticker.padStart(6, "0")}.KS` : quote.ticker.replace(/\./g, "-");
  const [summary, closes] = await Promise.all([
    fetchYahooDeepSummary(symbol),
    fetchYahooSixMonthCloses(symbol),
  ]);

  return {
    quote,
    high52w: summary?.summaryDetail?.fiftyTwoWeekHigh?.raw ?? null,
    low52w: summary?.summaryDetail?.fiftyTwoWeekLow?.raw ?? null,
    marketCap:
      summary?.price?.marketCap?.raw ?? summary?.summaryDetail?.marketCap?.raw ?? null,
    targetMean: summary?.financialData?.targetMeanPrice?.raw ?? null,
    targetHigh: summary?.financialData?.targetHighPrice?.raw ?? null,
    targetLow: summary?.financialData?.targetLowPrice?.raw ?? null,
    numAnalysts: summary?.financialData?.numberOfAnalystOpinions?.raw ?? null,
    recommendationKey: summary?.financialData?.recommendationKey ?? null,
    closes6mo: closes,
  };
}

function fmtRaw(v: number | null, currency: "KRW" | "USD"): string {
  if (v == null) return "n/a";
  return currency === "KRW" ? `${Math.round(v).toLocaleString("ko-KR")}원` : `$${v.toFixed(2)}`;
}

function fmtCap(v: number | null, currency: "KRW" | "USD"): string {
  if (v == null) return "n/a";
  if (currency === "KRW") {
    const trillion = v / 1e12;
    if (trillion >= 1) return `${trillion.toFixed(2)}조원`;
    return `${(v / 1e8).toFixed(0)}억원`;
  }
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  return `$${(v / 1e6).toFixed(0)}M`;
}

export function renderDeepProfileBlock(profile: DeepStockProfile): string {
  const { quote: q, closes6mo } = profile;
  const cur = q.currency;
  const max = closes6mo.length > 0 ? Math.max(...closes6mo) : null;
  const min = closes6mo.length > 0 ? Math.min(...closes6mo) : null;
  const recent10 = closes6mo.slice(-10).map((c) => fmtRaw(c, cur)).join(" → ");

  return `\n\n### DEEP STOCK PROFILE — ${q.name} (${q.ticker} · ${q.market})
The user requested a single-stock deep analysis ("주가분석"/analysis report).
You MUST set intent="single_stock" and populate "deep_analysis" using the EXACT
numbers below. Build the ASCII chart from the actual 6-month price path.

- 실시간 주가 (price_now): ${fmtRaw(q.price, cur)}
- 52주 밴드 (range_52w): ${fmtRaw(profile.low52w, cur)} ~ ${fmtRaw(profile.high52w, cur)}
- 6개월 차트 고/저: ${fmtRaw(max, cur)} / ${fmtRaw(min, cur)}
- 최근 10거래일 종가: ${recent10 || "n/a"}
- 시가총액: ${fmtCap(profile.marketCap, cur)}
- 30일 모멘텀: ${fmtPct(q.change30dPct)}
- PER: ${q.peRatio != null ? q.peRatio.toFixed(1) : "n/a"} · ROE: ${q.roe != null ? q.roe.toFixed(1) + "%" : "n/a"} · OPM: ${q.operatingMargin != null ? q.operatingMargin.toFixed(1) + "%" : "n/a"}
- 월가 평균 목표가: ${fmtRaw(profile.targetMean, cur)} (high ${fmtRaw(profile.targetHigh, cur)} / low ${fmtRaw(profile.targetLow, cur)}, 애널 ${profile.numAnalysts ?? "?"}명, rating: ${profile.recommendationKey ?? "n/a"})

### Required deep_analysis structure
Write in the user's locale. Mirror the institutional-broker memo format below:

1. **price_now / range_52w / analyst_target** — restate the live numbers above (one line each).
2. **volatility_drivers** — 2~4 bullet sentences explaining the latest catalysts that
   moved price (earnings beats, M&A, insider selling, partnerships, sector flow).
   Pull only from public, recent context; do NOT fabricate dollar figures.
3. **reverse_check** — 2~4 bullets validating WallPilot reverse-quant pillars:
   (a) cash fortress / balance sheet, (b) mega-trend linkage, (c) near-term
   catalyst, (d) profitability inflection. Use real ROE/OPM/PER above.
4. **ascii_chart** — a compact ASCII line/box chart (10-14 lines, monospace) showing
   52w high resistance, recent peak, current price, and key support, derived from
   the close path. Include a small volume note in the bottom row.
5. **trade_setup**:
   - entry_zone: 분할 매수 구간 (price band 10-20% below current, near 6mo support).
   - stop_loss: 기계적 손절가 (clear technical break level).
   - short_target: 1개월 단기 익절 (recent peak / resistance).
   - mid_target: 3~6개월 중기 목표 (analyst mean target).
   - long_target: 하반기/12개월 리레이팅 목표 (analyst high or 1.3x mean).
   Each must be a single-line string with price + 1-sentence rationale.
6. **final_verdict** — 2~3 sentence "월가 거인의 최종 권고" closing memo using
   the bull/bear tension surfaced in volatility_drivers.

Tone: decisive, broker-memo cadence, sparing use of 🚀🛡️📊🔍🟢🔴🔵 emojis to
section the prose. Do NOT add fake citations like [span_X].`;
}

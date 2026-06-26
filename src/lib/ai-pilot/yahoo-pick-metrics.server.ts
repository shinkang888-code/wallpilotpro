import { resolveStockInput } from "@/lib/api/stock-search.server";
import { fetchNewsHeadlines } from "@/lib/api/news-data.server";
import type { AiPilotPick } from "@/lib/types/ai-pilot";
import type { Market } from "@/lib/types/stock";

const UA = { "User-Agent": "Mozilla/5.0 WallPilot/1.0" };

type OhlcvBar = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type PickAccumulationMetrics = {
  vwapAccum: number;
  priceNow: number;
  low52w: number;
  high52w: number;
  currency: "KRW" | "USD";
  name: string;
};

function yahooCandidates(ticker: string, market: Market, override?: string): string[] {
  if (override) return [override];
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/i, "").padStart(6, "0");
    return [`${code}.KS`, `${code}.KQ`];
  }
  return [ticker.replace(/\./g, "-")];
}

function typicalPrice(bar: OhlcvBar): number {
  return (bar.high + bar.low + bar.close) / 3;
}

function computeYearlyVwap(bars: OhlcvBar[]): number {
  let volSum = 0;
  let pvSum = 0;
  for (const bar of bars) {
    if (bar.volume <= 0) continue;
    const tp = typicalPrice(bar);
    pvSum += tp * bar.volume;
    volSum += bar.volume;
  }
  if (volSum <= 0) {
    const closes = bars.map((b) => b.close).filter((c) => c > 0);
    return closes.length ? closes.reduce((a, b) => a + b, 0) / closes.length : 0;
  }
  return pvSum / volSum;
}

async function fetchYahooYearBars(symbol: string): Promise<OhlcvBar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(18_000) });
  if (!res.ok) return [];
  const json = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: {
          quote?: Array<{
            open?: (number | null)[];
            high?: (number | null)[];
            low?: (number | null)[];
            close?: (number | null)[];
            volume?: (number | null)[];
          }>;
        };
      }>;
    };
  };
  const result = json.chart?.result?.[0];
  if (!result?.timestamp?.length) return [];
  const q = result.indicators?.quote?.[0];
  const bars: OhlcvBar[] = [];
  for (let i = 0; i < result.timestamp.length; i++) {
    const close = q?.close?.[i];
    const high = q?.high?.[i];
    const low = q?.low?.[i];
    const open = q?.open?.[i];
    const volume = q?.volume?.[i];
    if (close == null || close <= 0 || high == null || low == null) continue;
    bars.push({
      date: new Date(result.timestamp[i]! * 1000).toISOString().slice(0, 10),
      open: open ?? close,
      high,
      low,
      close,
      volume: volume != null && volume > 0 ? volume : 0,
    });
  }
  return bars;
}

export async function fetchPickAccumulationMetrics(
  tickerInput: string,
  market: Market,
): Promise<PickAccumulationMetrics | null> {
  const resolved = await resolveStockInput(tickerInput).catch(() => null);
  const ticker = resolved?.ticker ?? tickerInput;
  const m = resolved?.market ?? market;
  const name = resolved?.name ?? ticker;
  const candidates = yahooCandidates(ticker, m, resolved?.yahooSymbol);

  for (const symbol of candidates) {
    const bars = await fetchYahooYearBars(symbol);
    if (bars.length < 20) continue;
    const vwapAccum = computeYearlyVwap(bars);
    const priceNow = bars.at(-1)!.close;
    return {
      vwapAccum,
      priceNow,
      low52w: Math.min(...bars.map((b) => b.low)),
      high52w: Math.max(...bars.map((b) => b.high)),
      currency: m === "KR" ? "KRW" : "USD",
      name,
    };
  }
  return null;
}

function fmtMoney(n: number, currency: "KRW" | "USD"): string {
  if (currency === "KRW") return `${Math.round(n).toLocaleString("ko-KR")}원`;
  return `$${n.toFixed(2)}`;
}

function fmtBand(lo: number, hi: number, currency: "KRW" | "USD"): string {
  if (currency === "KRW") {
    return `${Math.round(lo).toLocaleString("ko-KR")}~${Math.round(hi).toLocaleString("ko-KR")}원`;
  }
  return `$${lo.toFixed(2)} – $${hi.toFixed(2)}`;
}

function isBlank(value: string | undefined | null): boolean {
  const s = (value ?? "").trim();
  return !s || s === "-" || s === "0" || s === "N/A";
}

function buildLevels(m: PickAccumulationMetrics) {
  const { vwapAccum, low52w, high52w, priceNow, currency } = m;
  const entryLo = vwapAccum * 0.985;
  const entryHi = vwapAccum * 1.015;
  const stop = Math.min(vwapAccum * 0.9, low52w * 0.97);
  const target = Math.min(Math.max(vwapAccum * 1.15, priceNow * 1.1), high52w * 0.98);
  return {
    entryBand: fmtBand(entryLo, entryHi, currency),
    stopLoss: fmtMoney(stop, currency),
    targetPrice: fmtMoney(target, currency),
    priceBand:
      currency === "KRW"
        ? `현재 ${fmtMoney(priceNow, currency)} · 1Y 세력평단(VWAP) ${fmtMoney(vwapAccum, currency)}`
        : `Now ${fmtMoney(priceNow, currency)} · 1Y accum VWAP ${fmtMoney(vwapAccum, currency)}`,
  };
}

async function buildCatalyst(ticker: string, market: Market, lang: "ko" | "en"): Promise<string> {
  const news = await fetchNewsHeadlines(ticker, market, 3).catch(() => []);
  if (news.length === 0) {
    return lang === "ko" ? "최근 헤드라인 없음 · 실적·가이던스 확인" : "No recent headlines · check earnings";
  }
  const top = news.slice(0, 2).map((n) => n.title.trim());
  const prefix = lang === "ko" ? "뉴스" : "News";
  return `${prefix}: ${top.join(" · ")}`.slice(0, 120);
}

export async function enrichAiPilotPick(pick: AiPilotPick, lang: "ko" | "en"): Promise<AiPilotPick> {
  const metrics = await fetchPickAccumulationMetrics(pick.ticker, pick.market);
  if (!metrics) return pick;

  const levels = buildLevels(metrics);
  const catalyst = isBlank(pick.catalystTimeline)
    ? await buildCatalyst(pick.ticker, pick.market, lang)
    : pick.catalystTimeline;

  return {
    ...pick,
    name: isBlank(pick.name) ? metrics.name : pick.name,
    priceBand: isBlank(pick.priceBand) ? levels.priceBand : pick.priceBand,
    entryBand: isBlank(pick.entryBand) ? levels.entryBand : pick.entryBand,
    stopLoss: isBlank(pick.stopLoss) ? levels.stopLoss : pick.stopLoss,
    targetPrice: isBlank(pick.targetPrice) ? levels.targetPrice : pick.targetPrice,
    catalystTimeline: catalyst,
  };
}

export async function enrichAiPilotPicks(
  picks: AiPilotPick[] | undefined,
  lang: "ko" | "en",
): Promise<AiPilotPick[] | undefined> {
  if (!picks?.length) return picks;
  return Promise.all(picks.map((p) => enrichAiPilotPick(p, lang)));
}

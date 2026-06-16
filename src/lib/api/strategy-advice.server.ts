import { z } from "zod";

import { fetchDailyVolumeSeries } from "@/lib/api/chart-data.server";
import { callGeminiJson } from "@/lib/api/gemini-json.server";
import { resolveStockInput } from "@/lib/api/stock-search.server";
import type { StrategyAdvice } from "@/lib/types/chart";
import type { StockRow } from "@/lib/types/stock";

const adviceSchema = z.object({
  price_floor_30d: z.number(),
  price_ceiling_30d: z.number(),
  buy_timing: z.string().min(10),
  sell_timing: z.string().min(10),
  volume_insight: z.string().min(10),
  summary: z.string().min(10),
});

function formatMoney(n: number, currency: "KRW" | "USD") {
  return currency === "USD" ? `$${n.toFixed(2)}` : `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function buildFallback(row: StockRow, avgVol: number, volTrend: string, floor: number, ceil: number): StrategyAdvice {
  return {
    priceFloor30d: floor,
    priceCeiling30d: ceil,
    buyTiming: `Accumulate near buying zone ${row.buyingZone} when daily volume exceeds 20D average.`,
    sellTiming: `Trim toward profit target ${row.profitTarget}; respect hard stop ${row.hardStop}.`,
    volumeInsight: volTrend,
    summary: `30D range ${formatMoney(floor, row.currency)} – ${formatMoney(ceil, row.currency)} based on 3M volume-weighted price action.`,
    avgVolume20d: avgVol,
    recentVolumeTrend: volTrend,
  };
}

export async function generateStrategyAdvice(
  row: StockRow,
  geminiApiKey?: string | null,
): Promise<StrategyAdvice> {
  const resolved = await resolveStockInput(row.ticker);
  const points = await fetchDailyVolumeSeries(row.ticker, row.market);
  if (points.length < 10) {
    throw new Error("Insufficient volume history for strategy advice");
  }

  const recent20 = points.slice(-20);
  const avgVolume20d = recent20.reduce((s, p) => s + p.volume, 0) / recent20.length;
  const last5Avg = points.slice(-5).reduce((s, p) => s + p.volume, 0) / 5;
  const volRatio = avgVolume20d > 0 ? last5Avg / avgVolume20d : 1;
  const volTrend =
    volRatio >= 1.3
      ? `최근 5일 거래량이 20일 평균 대비 ${(volRatio * 100).toFixed(0)}% — 수급 유입`
      : volRatio <= 0.7
        ? `최근 5일 거래량이 20일 평균 대비 ${(volRatio * 100).toFixed(0)}% — 관망 구간`
        : `거래량 ${(volRatio * 100).toFixed(0)}% vs 20D — 중립`;

  const closes = points.map((p) => p.close);
  const low3m = Math.min(...closes);
  const high3m = Math.max(...closes);
  const floor = Math.min(row.price * 0.92, low3m * 0.98);
  const ceil = Math.max(row.price * 1.12, high3m * 1.02);
  const fallback = buildFallback(row, avgVolume20d, volTrend, floor, ceil);

  const volSample = points
    .slice(-30)
    .map((p) => `${p.date}: close=${p.close}, vol=${p.volume}`)
    .join("\n");

  const prompt = `You are a quant strategist. Use ONLY the data below. Korean prose for timing fields.

Ticker: ${resolved.ticker} (${resolved.name}) · ${row.market}
Current price: ${row.price} ${row.currency}
Buying zone: ${row.buyingZone}
Profit target: ${row.profitTarget}
Hard stop: ${row.hardStop}
Rating: ${row.rating}
3M low/high close: ${low3m} / ${high3m}
20D avg volume: ${avgVolume20d.toFixed(0)}
Volume trend: ${volTrend}

Last 30 daily bars:
${volSample}

Task: Forecast next 30 days price floor (support) and ceiling (resistance) using volume patterns.
Explain buy timing and sell timing in 2-3 sentences each.

Return JSON only:
{"price_floor_30d":0,"price_ceiling_30d":0,"buy_timing":"...","sell_timing":"...","volume_insight":"...","summary":"..."}`;

  const raw = await callGeminiJson(
    prompt,
    adviceSchema,
    {
      price_floor_30d: floor,
      price_ceiling_30d: ceil,
      buy_timing: fallback.buyTiming,
      sell_timing: fallback.sellTiming,
      volume_insight: volTrend,
      summary: fallback.summary,
    },
    { apiKey: geminiApiKey },
  );

  return {
    priceFloor30d: raw.price_floor_30d,
    priceCeiling30d: raw.price_ceiling_30d,
    buyTiming: raw.buy_timing,
    sellTiming: raw.sell_timing,
    volumeInsight: raw.volume_insight,
    summary: raw.summary,
    avgVolume20d: Math.round(avgVolume20d),
    recentVolumeTrend: volTrend,
  };
}

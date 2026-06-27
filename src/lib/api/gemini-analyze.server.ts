import { z } from "zod";

import { formatNewsForPrompt, type NewsHeadline } from "@/lib/api/news-data.server";
import { resolveGeminiApiKey } from "@/lib/gemini/resolve-gemini-key.server";
import type { TechnicalSnapshot } from "@/lib/quant/technical.server";
import {
  coercePortfolioRating,
  PORTFOLIO_RATINGS,
  type PortfolioRating,
} from "@/lib/types/rating";
import type { RawMarketSnapshot, ValuationResult } from "@/lib/types/stock";

const ratingEnum = z.enum(PORTFOLIO_RATINGS);

const analysisSchema = z.object({
  rating: ratingEnum,
  bull_catalysts: z.array(z.string()).min(1).max(3),
  bear_risks: z.array(z.string()).max(2),
  news_takeaway: z.string().optional(),
});

export type GeminiAnalysisResult = z.infer<typeof analysisSchema>;

/** @deprecated Use GeminiAnalysisResult */
export type GeminiCatalystResult = {
  bull_catalysts: string[];
  bear_risks: string[];
};

function fallbackRating(
  snapshot: RawMarketSnapshot,
  valuation: ValuationResult,
  technical?: TechnicalSnapshot | null,
): PortfolioRating {
  let score = 0;
  if (valuation.marginOfSafetyPct > 20) score += 2;
  else if (valuation.marginOfSafetyPct > 10) score += 1;
  if (valuation.pegRatio != null && valuation.pegRatio < 1) score += 1;
  if (valuation.quantitativeGrade === "Pass") score += 1;
  if (technical?.rsi14 != null && technical.rsi14 >= 45 && technical.rsi14 <= 68) score += 1;
  if (technical?.macdHistogram != null && technical.macdHistogram > 0) score += 1;
  if (snapshot.change30dPct > 5) score += 1;
  if (score >= 5) return "Buy";
  if (score >= 4) return "Overweight";
  if (score >= 2) return "Hold";
  if (score >= 1) return "Underweight";
  return "Sell";
}

function buildFallback(
  snapshot: RawMarketSnapshot,
  valuation: ValuationResult,
  technical?: TechnicalSnapshot | null,
): GeminiAnalysisResult {
  return {
    rating: fallbackRating(snapshot, valuation, technical),
    bull_catalysts: [
      valuation.marginOfSafetyPct > 15
        ? `Intrinsic value ${valuation.marginOfSafetyPct.toFixed(1)}% above market — margin of safety`
        : `30D momentum ${snapshot.change30dPct.toFixed(1)}% · quant ${valuation.quantitativeGrade}`,
      valuation.pegRatio != null && valuation.pegRatio < 1
        ? `PEG ${valuation.pegRatio.toFixed(2)} — growth-adjusted undervaluation`
        : `Volume ${valuation.volPrediction} — accumulation watch`,
    ],
    bear_risks: [
      valuation.quantitativeGrade === "Fail"
        ? "Quant screen fail: ROE or margin below threshold"
        : "Macro volatility may compress multiples short-term",
    ],
    news_takeaway: undefined,
  };
}

export async function geminiAnalyzeStock(
  snapshot: RawMarketSnapshot,
  valuation: ValuationResult,
  options?: { news?: NewsHeadline[]; geminiApiKey?: string | null },
): Promise<GeminiAnalysisResult> {
  const technical = snapshot.technical;
  const news = options?.news ?? [];
  const fallback = buildFallback(snapshot, valuation, technical);
  const geminiApiKey = resolveGeminiApiKey(options?.geminiApiKey);
  if (!geminiApiKey) return fallback;

  const newsBlock = formatNewsForPrompt(news);
  const techBlock = technical?.label ?? "N/A";

  const prompt = `You are a cold Wall Street quant analyst (WallPilot Portfolio Manager).
Use ONLY the numbers and headlines below. No hype. Output a 5-tier rating.

Ticker: ${snapshot.ticker} (${snapshot.name})
Price: ${snapshot.price} ${snapshot.currency}
Intrinsic Value: ${valuation.intrinsicValue}
Margin of Safety: ${valuation.marginOfSafetyPct}%
PEG: ${valuation.pegRatio ?? "N/A"}
ROE: ${snapshot.roe ?? "N/A"}%
30D Change: ${snapshot.change30dPct.toFixed(1)}%
Quant Grade: ${valuation.quantitativeGrade}
Technical: ${techBlock}

Recent headlines:
${newsBlock}

Rating scale (pick exactly one): Buy | Overweight | Hold | Underweight | Sell

Return JSON only:
{"rating":"Hold","bull_catalysts":["2 short upside triggers"],"bear_risks":["1 key downside risk"],"news_takeaway":"1 sentence on headline impact"}`;

  try {
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallback;
    const parsed = analysisSchema.safeParse(JSON.parse(text));
    if (!parsed.success) {
      const raw = JSON.parse(text) as Record<string, unknown>;
      return {
        rating: coercePortfolioRating(raw.rating, fallback.rating),
        bull_catalysts: Array.isArray(raw.bull_catalysts)
          ? (raw.bull_catalysts as string[]).slice(0, 3)
          : fallback.bull_catalysts,
        bear_risks: Array.isArray(raw.bear_risks)
          ? (raw.bear_risks as string[]).slice(0, 2)
          : fallback.bear_risks,
        news_takeaway: typeof raw.news_takeaway === "string" ? raw.news_takeaway : undefined,
      };
    }
    return parsed.data;
  } catch {
    return fallback;
  }
}

/** Backward-compatible wrapper — catalysts only. */
export async function geminiAnalyzeCatalysts(
  snapshot: RawMarketSnapshot,
  valuation: ValuationResult,
  options?: { news?: NewsHeadline[] },
): Promise<GeminiCatalystResult> {
  const result = await geminiAnalyzeStock(snapshot, valuation, options);
  return {
    bull_catalysts: result.bull_catalysts,
    bear_risks: result.bear_risks,
  };
}

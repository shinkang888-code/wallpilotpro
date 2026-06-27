import { z } from "zod";

import { callGeminiJson } from "@/lib/api/gemini-json.server";
import { formatNewsForPrompt, type NewsHeadline } from "@/lib/api/news-data.server";
import type { DebateVerdict } from "@/lib/types/agent";
import { coercePortfolioRating, PORTFOLIO_RATINGS, type PortfolioRating } from "@/lib/types/rating";
import type { RawMarketSnapshot, ValuationResult } from "@/lib/types/stock";

export type { DebateVerdict } from "@/lib/types/agent";

const debateSchema = z.object({
  bull_case: z.string().min(20).max(600),
  bear_case: z.string().min(20).max(600),
  verdict: z.string().min(10).max(300),
  rating: z.enum(PORTFOLIO_RATINGS),
});

export type DebateInput = {
  snapshot: RawMarketSnapshot;
  valuation: ValuationResult;
  news: NewsHeadline[];
  initialRating: PortfolioRating;
  geminiApiKey?: string | null;
};

function fallbackDebate(input: DebateInput): DebateVerdict {
  const { snapshot, valuation, initialRating } = input;
  return {
    bullCase:
      valuation.marginOfSafetyPct > 10
        ? `Margin of safety ${valuation.marginOfSafetyPct.toFixed(1)}% with quant grade ${valuation.quantitativeGrade} supports upside.`
        : `30D momentum ${snapshot.change30dPct.toFixed(1)}% and ${valuation.volPrediction} volume signal accumulation.`,
    bearCase:
      valuation.quantitativeGrade === "Fail"
        ? "Quant screen failure on ROE or operating margin raises fundamental risk."
        : "Macro multiple compression and headline volatility may cap near-term returns.",
    verdict: `Balanced view — maintain ${initialRating} pending clearer catalyst confirmation.`,
    rating: initialRating,
  };
}

/** Bull/Bear 1-round mini-debate → Judge 5-tier (WallPilot research manager). */
export async function runMiniDebate(input: DebateInput): Promise<DebateVerdict> {
  const { snapshot, valuation, news, initialRating } = input;
  const fallback = fallbackDebate(input);
  const tech = snapshot.technical?.label ?? "N/A";

  const prompt = `You simulate a Wall Street investment committee mini-debate (WallPilot Agent Desk style).
Roles: Bull Analyst (1 paragraph), Bear Analyst (1 paragraph), Research Manager (verdict + 5-tier rating).

Ticker: ${snapshot.ticker} (${snapshot.name}) · ${snapshot.market}
Price: ${snapshot.price} ${snapshot.currency}
Intrinsic: ${valuation.intrinsicValue} · MOS: ${valuation.marginOfSafetyPct.toFixed(1)}%
PEG: ${valuation.pegRatio ?? "N/A"} · Quant: ${valuation.quantitativeGrade}
Technical: ${tech}
Initial rating hint: ${initialRating}

News:
${formatNewsForPrompt(news)}

Rules:
- Use ONLY provided numbers/headlines. No hype.
- bull_case and bear_case: exactly one paragraph each (2-4 sentences).
- verdict: Research Manager synthesis (1-2 sentences).
- rating: exactly one of Buy | Overweight | Hold | Underweight | Sell

Return JSON only:
{"bull_case":"...","bear_case":"...","verdict":"...","rating":"Hold"}`;

  const raw = await callGeminiJson(
    prompt,
    debateSchema,
    {
      bull_case: fallback.bullCase,
      bear_case: fallback.bearCase,
      verdict: fallback.verdict,
      rating: fallback.rating,
    },
    { apiKey: input.geminiApiKey },
  );

  return {
    bullCase: raw.bull_case.trim(),
    bearCase: raw.bear_case.trim(),
    verdict: raw.verdict.trim(),
    rating: coercePortfolioRating(raw.rating, initialRating),
  };
}

export async function debateTopPicks(
  rows: Array<DebateInput & { ticker: string }>,
  limit = 5,
  geminiApiKey?: string | null,
): Promise<Map<string, DebateVerdict>> {
  const targets = rows.slice(0, limit);
  const results = await Promise.all(
    targets.map(async (row) => {
      const verdict = await runMiniDebate({ ...row, geminiApiKey: row.geminiApiKey ?? geminiApiKey });
      return [row.ticker, verdict] as const;
    }),
  );
  return new Map(results);
}

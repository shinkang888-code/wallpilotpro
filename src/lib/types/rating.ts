/** 5-tier scale — WallPilot portfolio rating. */

export const PORTFOLIO_RATINGS = [
  "Buy",
  "Overweight",
  "Hold",
  "Underweight",
  "Sell",
] as const;

export type PortfolioRating = (typeof PORTFOLIO_RATINGS)[number];

const RATING_SET = new Set(PORTFOLIO_RATINGS.map((r) => r.toLowerCase()));

export function isPortfolioRating(value: string): value is PortfolioRating {
  return RATING_SET.has(value.toLowerCase());
}

/** Normalize arbitrary LLM output to a valid 5-tier rating. */
export function coercePortfolioRating(value: unknown, fallback: PortfolioRating = "Hold"): PortfolioRating {
  if (typeof value !== "string") return fallback;
  const clean = value.trim().replace(/^\*+|\*+$/g, "");
  for (const r of PORTFOLIO_RATINGS) {
    if (clean.toLowerCase() === r.toLowerCase()) return r;
  }
  return fallback;
}

/** Heuristic parse from prose (Rating: Buy). */
export function parseRatingFromText(text: string, fallback: PortfolioRating = "Hold"): PortfolioRating {
  const labelRe = /rating.*?[:\-][\s*]*(\w+)/i;
  for (const line of text.split("\n")) {
    const m = labelRe.exec(line);
    if (m && isPortfolioRating(m[1])) return coercePortfolioRating(m[1]);
  }
  for (const line of text.split("\n")) {
    for (const word of line.toLowerCase().split(/\s+/)) {
      const clean = word.replace(/[*:.,]/g, "");
      if (isPortfolioRating(clean)) return coercePortfolioRating(clean);
    }
  }
  return fallback;
}

/** Higher = more bullish — for screener tie-breaks. */
export function ratingScore(rating: PortfolioRating): number {
  switch (rating) {
    case "Buy":
      return 5;
    case "Overweight":
      return 4;
    case "Hold":
      return 3;
    case "Underweight":
      return 2;
    case "Sell":
      return 1;
  }
}

export function isBearishRating(rating: PortfolioRating): boolean {
  return rating === "Sell" || rating === "Underweight";
}

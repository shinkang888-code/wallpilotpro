import type { LynchInput, LynchResult } from "@/lib/quant/analyzers/types.server";

/** Peter Lynch GARP — adapted from korea-stock-analyzer-mcp. */
export function analyzeLynch(input: LynchInput): LynchResult {
  const { price, per, eps, epsGrowthPct, divYield } = input;
  const growth = Math.max(epsGrowthPct, 1);
  const peg = per > 0 && growth > 0 ? round2(per / growth) : 999;
  const dividendAdjustedPEG =
    per > 0 && growth + divYield > 0 ? round2(per / (growth + divYield)) : 999;

  const companyType = classifyCompany(growth, per, input);
  const fairPer = determineFairPER(growth, companyType);
  const fairValue = Math.max(0, Math.round(eps * fairPer));
  const upsidePct = price > 0 ? round1(((fairValue - price) / price) * 100) : 0;

  const lynchScore = scoreLynch({
    peg,
    dividendAdjustedPEG,
    epsGrowthPct: growth,
    divYield,
    companyType,
  });

  return {
    fairValue,
    pegRatio: peg,
    dividendAdjustedPEG,
    lynchScore,
    companyType,
    recommendation: lynchRecommendation(peg, dividendAdjustedPEG, upsidePct, lynchScore),
    upsidePct,
  };
}

function classifyCompany(growthRate: number, per: number, input: LynchInput): string {
  const pbr = input.eps > 0 ? input.price / input.eps / (input.per || 1) : 1;
  if (growthRate > 20) return "Fast Grower";
  if (growthRate > 10) return "Stalwart";
  if (growthRate > 5) return "Slow Grower";
  if (per < 10 && pbr < 1) return "Asset Play";
  if (growthRate < 0) return "Turnaround";
  return "Cyclical";
}

function determineFairPER(growthRate: number, companyType: string): number {
  let fairPer = Math.max(growthRate, 5);
  if (companyType === "Fast Grower") fairPer = Math.min(fairPer * 1.5, 40);
  else if (companyType === "Stalwart") fairPer = Math.min(fairPer, 20);
  else if (companyType === "Slow Grower") fairPer = Math.min(fairPer * 0.8, 12);
  else if (companyType === "Asset Play") fairPer = 10;
  else if (companyType === "Turnaround") fairPer = 8;
  else fairPer = Math.min(fairPer, 15);
  return fairPer;
}

function scoreLynch(m: {
  peg: number;
  dividendAdjustedPEG: number;
  epsGrowthPct: number;
  divYield: number;
  companyType: string;
}): number {
  let score = 0;
  if (m.peg <= 0.5) score += 40;
  else if (m.peg <= 1.0) score += 30;
  else if (m.peg <= 1.5) score += 20;
  else if (m.peg <= 2.0) score += 10;

  if (m.dividendAdjustedPEG <= 1.0) score += 20;
  else if (m.dividendAdjustedPEG <= 1.5) score += 10;

  if (m.epsGrowthPct >= 20) score += 15;
  else if (m.epsGrowthPct >= 15) score += 10;
  else if (m.epsGrowthPct >= 10) score += 5;

  if (m.companyType === "Fast Grower" || m.companyType === "Stalwart") score += 5;
  return score;
}

function lynchRecommendation(
  peg: number,
  divPeg: number,
  upside: number,
  score: number,
): string {
  if (score >= 80 && peg <= 1 && upside > 30) return "Strong Buy";
  if (score >= 60 && peg <= 1.5 && upside > 15) return "Buy";
  if (score >= 40 || peg <= 2) return "Hold";
  if (score >= 20) return "Sell";
  return "Strong Sell";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

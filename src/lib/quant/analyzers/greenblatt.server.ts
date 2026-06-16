import type { GreenblattInput, GreenblattResult } from "@/lib/quant/analyzers/types.server";

/** Joel Greenblatt Magic Formula — adapted from korea-stock-analyzer-mcp. */
export function analyzeGreenblatt(input: GreenblattInput): GreenblattResult {
  const { price, eps, bps, marketCap, pbr } = input;
  const roic = calculateROIC(eps, bps);
  const earningsYield = calculateEarningsYield(eps, price, marketCap);
  const adjustedMagic = Math.round(Math.min(roic, 50) + Math.min(earningsYield * 2, 50));

  const qualityScore = [
    eps > 0,
    input.price > 0 && (input.price / eps) < 25,
    pbr > 0 && pbr < 3,
  ].filter(Boolean).length * 20;

  const fairValue = calculateFairValue(eps, roic, price);
  const upsidePct = price > 0 ? round1(((fairValue - price) / price) * 100) : 0;

  const comprehensiveScore = scoreComprehensive(adjustedMagic, qualityScore, upsidePct);

  return {
    fairValue,
    roic: round2(roic),
    earningsYield: round2(earningsYield),
    magicScore: adjustedMagic,
    comprehensiveScore,
    investmentGrade: investmentGrade(comprehensiveScore),
    recommendation: greenblattRecommendation(comprehensiveScore, adjustedMagic),
    upsidePct,
  };
}

function calculateROIC(eps: number, bps: number): number {
  const ebit = eps * 1.3;
  const investedCapital = bps * 0.8;
  if (investedCapital <= 0) return 0;
  return (ebit / investedCapital) * 100;
}

function calculateEarningsYield(eps: number, price: number, marketCap: number): number {
  if (marketCap <= 0 || eps <= 0 || price <= 0) return 0;
  const ebit = eps * 1.43;
  const enterpriseValue = marketCap * 1.3;
  const shares = marketCap / price;
  return round2((ebit * shares) / enterpriseValue * 100);
}

function calculateFairValue(eps: number, roic: number, price: number): number {
  let targetYield = 10;
  if (roic > 30) targetYield = 7;
  else if (roic > 20) targetYield = 8;
  else if (roic > 15) targetYield = 9;
  const targetPer = 100 / targetYield;
  let fairValue = Math.round(eps * targetPer);
  if (fairValue > price * 3) fairValue = Math.round(price * 2.5);
  return Math.max(0, fairValue);
}

function scoreComprehensive(magicScore: number, qualityScore: number, upside: number): number {
  let score = 0;
  if (magicScore >= 80) score += 40;
  else if (magicScore >= 60) score += 30;
  else if (magicScore >= 40) score += 20;
  else if (magicScore >= 20) score += 10;
  score += qualityScore * 0.2;
  if (upside > 50) score += 10;
  else if (upside > 30) score += 7;
  else if (upside > 15) score += 5;
  return Math.round(score);
}

function investmentGrade(score: number): string {
  if (score >= 80) return "A+";
  if (score >= 70) return "A";
  if (score >= 60) return "B+";
  if (score >= 50) return "B";
  if (score >= 40) return "C";
  return "D";
}

function greenblattRecommendation(comprehensiveScore: number, magicScore: number): string {
  if (comprehensiveScore >= 80 && magicScore >= 60) return "Strong Buy";
  if (comprehensiveScore >= 60 && magicScore >= 50) return "Buy";
  if (comprehensiveScore >= 40 || magicScore >= 30) return "Hold";
  if (comprehensiveScore >= 20) return "Sell";
  return "Strong Sell";
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

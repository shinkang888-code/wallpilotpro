import { analyzeGreenblatt } from "@/lib/quant/analyzers/greenblatt.server";
import { analyzeLynch } from "@/lib/quant/analyzers/lynch.server";
import { technicalScore } from "@/lib/quant/technical.server";
import type { Currency, RawMarketSnapshot, ValuationResult } from "@/lib/types/stock";

const STOP_LOSS_PCT = 0.08;
const LYNCH_WEIGHT = 0.45;
const GREENBLATT_WEIGHT = 0.55;

export function calculateValuation(snapshot: RawMarketSnapshot): ValuationResult {
  const price = snapshot.price;
  const per = snapshot.peRatio ?? 20;
  const eps = snapshot.eps ?? (per > 0 ? price / per : price / 20);
  const epsGrowth = snapshot.epsGrowth ?? 12;
  const divYield = snapshot.divYield ?? 0;
  const pbr = snapshot.pbr ?? 1.5;
  const bps = snapshot.bps ?? (pbr > 0 ? price / pbr : eps * 5);
  const marketCap = snapshot.marketCap ?? price * 50_000_000;

  const lynch = analyzeLynch({
    price,
    per,
    eps,
    epsGrowthPct: epsGrowth,
    divYield,
  });

  const greenblatt = analyzeGreenblatt({
    price,
    eps,
    bps,
    marketCap,
    pbr,
  });

  const intrinsicValue = Math.round(
    lynch.fairValue * LYNCH_WEIGHT + greenblatt.fairValue * GREENBLATT_WEIGHT,
  );
  const marginOfSafetyPct =
    intrinsicValue > 0 ? ((intrinsicValue - price) / intrinsicValue) * 100 : 0;

  const pegRatio = lynch.pegRatio < 900 ? lynch.pegRatio : null;

  const roePass = snapshot.roe == null || snapshot.roe >= 15;
  const marginPass = snapshot.operatingMargin == null || snapshot.operatingMargin >= 20;
  const quantitativeGrade = roePass && marginPass ? "Pass" : "Fail";

  const discount = intrinsicValue > price ? 0.04 : 0.02;
  const buyingZoneLow = Math.min(price * 0.96, intrinsicValue * (1 - discount - 0.02));
  const buyingZoneHigh = Math.min(price * 0.99, intrinsicValue * (1 - discount));
  const profitTarget = Math.max(intrinsicValue * 0.98, price * (marginOfSafetyPct > 20 ? 1.15 : 1.12));
  const hardStop = price * (1 - STOP_LOSS_PCT);

  const techBoost = Math.min(8, technicalScore(snapshot.technical) / 3);
  const momentum = clampMomentum(snapshot.change30dPct + techBoost);
  const volRatio =
    snapshot.avgVolume20d > 0 ? (snapshot.volume / snapshot.avgVolume20d) * 100 : 100;
  const volPrediction = `${volRatio.toFixed(0)}% vs 20D avg`;

  const guruBadges = buildGuruBadges(lynch, greenblatt);

  return {
    intrinsicValue: round2(intrinsicValue),
    marginOfSafetyPct: round1(marginOfSafetyPct),
    pegRatio,
    quantitativeGrade,
    buyingZoneLow,
    buyingZoneHigh,
    profitTarget,
    hardStop,
    volPrediction,
    momentum,
    lynchScore: lynch.lynchScore,
    greenblattScore: greenblatt.comprehensiveScore,
    lynchRecommendation: lynch.recommendation,
    greenblattRecommendation: greenblatt.recommendation,
    greenblattGrade: greenblatt.investmentGrade,
    guruBadges,
    supplyLabel: snapshot.supplyLabel ?? null,
  };
}

function buildGuruBadges(
  lynch: ReturnType<typeof analyzeLynch>,
  greenblatt: ReturnType<typeof analyzeGreenblatt>,
): string[] {
  const badges: string[] = [];
  if (lynch.pegRatio <= 1) badges.push(`PEG ${lynch.pegRatio.toFixed(1)}`);
  if (lynch.lynchScore >= 60) badges.push(`Lynch ${lynch.lynchScore}`);
  badges.push(`Magic ${greenblatt.investmentGrade}`);
  if (greenblatt.magicScore >= 50) badges.push(`MF ${greenblatt.magicScore}`);
  return badges.slice(0, 3);
}

export function formatMoney(n: number, currency: Currency): string {
  if (currency === "USD") return `$${n.toFixed(2)}`;
  return `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

export function formatBuyingZone(low: number, high: number, currency: Currency): string {
  return `${formatMoney(low, currency)} – ${formatMoney(high, currency)}`;
}

function clampMomentum(change30dPct: number): number {
  return Math.max(-100, Math.min(100, Math.round(change30dPct * 3)));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

import { MATRIX_RANK_POOL_SIZE } from "@/lib/quant/matrix-config";
import { supplyTrendScore } from "@/lib/quant/analyzers/supply-demand.server";
import { technicalScore } from "@/lib/quant/technical.server";
import type { RawMarketSnapshot } from "@/lib/types/stock";

export function isVolumeSpike(snapshot: RawMarketSnapshot): boolean {
  if (snapshot.avgVolume20d <= 0) return false;
  const ratio = snapshot.volume / snapshot.avgVolume20d;
  return ratio >= 2.5 && snapshot.change30dPct > 0;
}

export function passesQuantScreen(snapshot: RawMarketSnapshot): boolean {
  const roeOk = snapshot.roe == null || snapshot.roe >= 15;
  const marginOk = snapshot.operatingMargin == null || snapshot.operatingMargin >= 10;
  const liquid = snapshot.price * snapshot.volume > 5_000_000;
  return roeOk && marginOk && liquid;
}

/** Rank and trim universe to top candidates for analysis. */
export function rankCandidates(snapshots: RawMarketSnapshot[]): RawMarketSnapshot[] {
  return [...snapshots]
    .filter((s) => s.price > 0)
    .sort((a, b) => scoreCandidate(b) - scoreCandidate(a))
    .slice(0, MATRIX_RANK_POOL_SIZE);
}

function scoreCandidate(s: RawMarketSnapshot): number {
  let score = 0;
  if (isVolumeSpike(s)) score += 40;
  if (passesQuantScreen(s)) score += 30;
  score += Math.min(30, Math.abs(s.change30dPct) * 2);
  if (s.cashToMcap != null && s.cashToMcap > 0.15) score += 15;
  if (s.supplyTrend) score += supplyTrendScore(s.supplyTrend);
  score += technicalScore(s.technical);
  return score;
}

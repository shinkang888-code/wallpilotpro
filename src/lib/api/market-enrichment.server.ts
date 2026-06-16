import {
  epsGrowth3yFromYearly,
  fetchKrFinancial,
  fetchKrMarket,
  fetchKrSupplyDemand,
} from "@/lib/api/korea-stock-mcp.server";
import { analyzeSupplyDemand } from "@/lib/quant/analyzers/supply-demand.server";
import type { SupplyDemandSignal } from "@/lib/quant/analyzers/types.server";
import type { RawMarketSnapshot } from "@/lib/types/stock";

/** Enrich KR snapshots via korea-stock-analyzer-mcp HTTP API. */
export async function enrichMarketSnapshot(snapshot: RawMarketSnapshot): Promise<RawMarketSnapshot> {
  if (snapshot.market !== "KR") return snapshot;

  const [financial, supplyRaw, market] = await Promise.all([
    fetchKrFinancial(snapshot.ticker),
    fetchKrSupplyDemand(snapshot.ticker),
    fetchKrMarket(snapshot.ticker),
  ]);

  let supply = analyzeSupplyDemand(supplyRaw);
  if (!supplyRaw && snapshot.avgVolume20d > 0) {
    supply = volumeSupplyFallback(snapshot);
  }
  const metrics = financial?.metrics;
  const epsGrowth3y = epsGrowth3yFromYearly(financial);

  const per = metrics?.per ?? snapshot.peRatio;
  const eps = metrics?.eps ?? (per && per > 0 ? snapshot.price / per : null);
  const pbr = metrics?.pbr ?? null;
  const bps = metrics?.bps ?? (pbr && pbr > 0 ? snapshot.price / pbr : null);
  const roe = metrics?.roe ?? snapshot.roe;
  const divYield = metrics?.dividendYield ?? null;
  const epsGrowth = epsGrowth3y ?? snapshot.epsGrowth;

  let cashToMcap = snapshot.cashToMcap;
  if (pbr != null && pbr < 1) cashToMcap = Math.max(cashToMcap ?? 0, 0.15);

  const marketCap = market?.marketCap ?? estimateMarketCap(snapshot.price, eps, pbr, bps);

  return {
    ...snapshot,
    peRatio: per ?? snapshot.peRatio,
    roe,
    epsGrowth,
    eps: eps ?? snapshot.eps,
    pbr: pbr ?? snapshot.pbr,
    bps: bps ?? snapshot.bps,
    divYield: divYield ?? snapshot.divYield,
    marketCap: marketCap ?? snapshot.marketCap,
    cashToMcap,
    foreignNetAmount: supply.foreignNetAmount,
    institutionNetAmount: supply.institutionNetAmount,
    individualNetAmount: supply.individualNetAmount,
    supplyTrend: supply.trend,
    supplyLabel: supply.label,
  };
}

export async function enrichMarketBatch(snapshots: RawMarketSnapshot[]): Promise<RawMarketSnapshot[]> {
  return Promise.all(snapshots.map(enrichMarketSnapshot));
}

/** When MCP HTTP is unavailable, infer flow from volume vs 20D average. */
function volumeSupplyFallback(snapshot: RawMarketSnapshot): SupplyDemandSignal {
  const ratio = snapshot.volume / snapshot.avgVolume20d;
  if (ratio >= 2.5 && snapshot.change30dPct > 0) {
    return {
      foreignNetAmount: null,
      institutionNetAmount: null,
      individualNetAmount: null,
      trend: "accumulating",
      label: `거래량 ${(ratio * 100).toFixed(0)}% vs 20D — MCP 수급 미연결`,
    };
  }
  if (ratio >= 2.5 && snapshot.change30dPct < 0) {
    return {
      foreignNetAmount: null,
      institutionNetAmount: null,
      individualNetAmount: null,
      trend: "selling",
      label: `거래량 급증 + 하락 — MCP 수급 미연결`,
    };
  }
  return {
    foreignNetAmount: null,
    institutionNetAmount: null,
    individualNetAmount: null,
    trend: "neutral",
    label: "MCP 수급 API 미연결 — 중립",
  };
}

function estimateMarketCap(
  price: number,
  eps: number | null,
  pbr: number | null,
  bps: number | null,
): number | null {
  if (price <= 0) return null;
  if (pbr && pbr > 0 && bps && bps > 0) {
    const shares = (price / pbr / bps) * 1e0;
    if (shares > 0) return price * shares;
  }
  if (eps && eps > 0) return price * 50_000_000;
  return null;
}

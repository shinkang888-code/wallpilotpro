/**
 * Unit tests for Lynch, Greenblatt, supply-demand modules.
 * Run: npm run test:analyzers
 */
import assert from "node:assert/strict";

import { analyzeGreenblatt } from "../src/lib/quant/analyzers/greenblatt.server.ts";
import { analyzeLynch } from "../src/lib/quant/analyzers/lynch.server.ts";
import {
  analyzeSupplyDemand,
  supplyTrendScore,
} from "../src/lib/quant/analyzers/supply-demand.server.ts";
import { calculateValuation } from "../src/lib/quant/valuation.server.ts";
import type { RawMarketSnapshot } from "../src/lib/types/stock.ts";

function testLynch() {
  const r = analyzeLynch({ price: 100, per: 15, eps: 6.67, epsGrowthPct: 20, divYield: 2 });
  assert.ok(r.fairValue > 0, "lynch fair value");
  assert.ok(r.pegRatio > 0 && r.pegRatio < 2, "peg in range");
  assert.ok(r.lynchScore >= 0, "lynch score");
  console.log("  Lynch:", r.recommendation, "PEG", r.pegRatio, "fair", r.fairValue);
}

function testGreenblatt() {
  const r = analyzeGreenblatt({
    price: 100,
    eps: 5,
    bps: 50,
    marketCap: 1e12,
    pbr: 2,
  });
  assert.ok(r.fairValue > 0, "greenblatt fair value");
  assert.ok(r.magicScore >= 0, "magic score");
  console.log("  Greenblatt:", r.recommendation, "grade", r.investmentGrade);
}

function testSupply() {
  const strongBuy = analyzeSupplyDemand({
    ticker: "005930",
    netAmountByInvestor: { foreign: 5e10, institution: 3e10, individual: -8e10 },
    recent: [
      { date: "2026-01-01", foreign: 1e9, institution: 5e8, individual: -1.5e9 },
      { date: "2026-01-02", foreign: 2e9, institution: 1e9, individual: -3e9 },
    ],
  });
  assert.equal(strongBuy.trend, "strong_buy");
  assert.equal(supplyTrendScore(strongBuy.trend), 25);

  const neutral = analyzeSupplyDemand(null);
  assert.equal(neutral.trend, "neutral");
  console.log("  Supply strong_buy OK, neutral OK");
}

function testValuationIntegration() {
  const snapshot: RawMarketSnapshot = {
    ticker: "005930",
    name: "Samsung",
    market: "KR",
    currency: "KRW",
    price: 70000,
    change30dPct: 10,
    volume: 1e7,
    avgVolume20d: 8e6,
    peRatio: 12,
    roe: 18,
    operatingMargin: 25,
    epsGrowth: 15,
    cashToMcap: 0.1,
    eps: 5800,
    pbr: 1.2,
    bps: 58000,
    divYield: 2,
    marketCap: 4e14,
    supplyTrend: "accumulating",
    supplyLabel: "test",
  };
  const v = calculateValuation(snapshot);
  assert.ok(v.intrinsicValue > 0);
  assert.ok(v.guruBadges.length > 0);
  assert.ok(v.lynchScore > 0);
  assert.ok(v.greenblattScore >= 0);
  console.log("  Valuation badges:", v.guruBadges.join(", "));
}

function main() {
  console.log("=== Analyzer module tests ===\n");
  testLynch();
  testGreenblatt();
  testSupply();
  testValuationIntegration();
  console.log("\nPASS: all analyzer tests");
}

main();

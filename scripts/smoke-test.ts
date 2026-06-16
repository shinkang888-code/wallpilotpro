/**
 * Integration smoke test — run: npx tsx scripts/smoke-test.ts
 */
import { buildUniverse } from "../src/lib/quant/universe.server.ts";
import { fetchMarketBatch } from "../src/lib/api/market-data.server.ts";
import { rankCandidates } from "../src/lib/quant/screener.server.ts";
import { calculateValuation } from "../src/lib/quant/valuation.server.ts";
import { classifyRows } from "../src/lib/quant/classify.server.ts";
import { geminiAnalyzeCatalysts } from "../src/lib/api/gemini-analyze.server.ts";

async function main() {
  console.log("=== WallPilot smoke test ===\n");

  const universe = buildUniverse({ toss: true, thirteenF: true, quant: true });
  console.log(`Universe size: ${universe.length}`);

  const snapshots = await fetchMarketBatch(universe.slice(0, 8));
  console.log(`Market data fetched: ${snapshots.length}/${Math.min(8, universe.length)}`);

  if (snapshots.length === 0) {
    console.error("FAIL: No market data — Yahoo Finance may be blocked");
    process.exit(1);
  }

  for (const s of snapshots.slice(0, 2)) {
    console.log(`  ${s.ticker} (${s.market}): ${s.currency} ${s.price.toFixed(2)}, 30d ${s.change30dPct.toFixed(1)}%`);
  }

  const ranked = rankCandidates(snapshots);
  console.log(`Ranked candidates: ${ranked.length}`);

  const analyzed = [];
  for (const snapshot of ranked.slice(0, 5)) {
    const valuation = calculateValuation(snapshot);
    const gemini = await geminiAnalyzeCatalysts(snapshot, valuation);
    analyzed.push({
      snapshot,
      valuation,
      catalysts: [...gemini.bull_catalysts].slice(0, 3),
    });
  }

  const { shortSqueeze, highCash } = classifyRows(analyzed);
  console.log(`Short-squeeze: ${shortSqueeze.length}, High-cash: ${highCash.length}`);

  if (shortSqueeze.length + highCash.length === 0) {
    console.error("FAIL: Classification returned empty");
    process.exit(1);
  }

  console.log("\nSample row:", JSON.stringify(shortSqueeze[0] ?? highCash[0], null, 2));
  console.log("\nPASS: Pipeline OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

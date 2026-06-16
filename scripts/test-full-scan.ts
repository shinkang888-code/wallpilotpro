/**
 * Full scan pipeline test — run: npm run test:full-scan
 */
import { geminiAnalyzeStock } from "../src/lib/api/gemini-analyze.server.ts";
import { fetchNewsHeadlines } from "../src/lib/api/news-data.server.ts";
import { enrichMarketBatch } from "../src/lib/api/market-enrichment.server.ts";
import { fetchMarketBatch } from "../src/lib/api/market-data.server.ts";
import { classifyRows, type AnalyzedRow } from "../src/lib/quant/classify.server.ts";
import { rankCandidates } from "../src/lib/quant/screener.server.ts";
import { calculateValuation } from "../src/lib/quant/valuation.server.ts";
import { buildUniverse } from "../src/lib/quant/universe.server.ts";

async function main() {
  console.log("=== WallPilot full scan test ===\n");
  const toggles = { toss: true, thirteenF: true, quant: false };
  const universe = buildUniverse(toggles);
  const snapshots = await enrichMarketBatch(await fetchMarketBatch(universe));
  const ranked = rankCandidates(snapshots);
  const withSupply = snapshots.filter((s) => s.supplyTrend && s.supplyTrend !== "neutral").length;
  console.log(`KR enrichment supply signals: ${withSupply}/${snapshots.filter((s) => s.market === "KR").length}`);

  if (ranked.length === 0) {
    console.error("FAIL: No ranked candidates");
    process.exit(1);
  }

  const analyzed: AnalyzedRow[] = await Promise.all(
    ranked.map(async (snapshot) => {
      const valuation = calculateValuation(snapshot);
      const news = await fetchNewsHeadlines(snapshot.ticker, snapshot.market, 3);
      const gemini = await geminiAnalyzeStock(snapshot, valuation, { news });
      const catalysts = [
        ...gemini.bull_catalysts,
        ...gemini.bear_risks.map((r) => `Risk: ${r}`),
      ];
      return { snapshot, valuation, catalysts: catalysts.slice(0, 3), rating: gemini.rating };
    }),
  );

  const { shortSqueeze, highCash } = classifyRows(analyzed);
  console.log(`Universe: ${universe.length}, Fetched: ${snapshots.length}, Ranked: ${ranked.length}`);
  console.log(`Short-squeeze: ${shortSqueeze.length}, High-cash: ${highCash.length}`);

  if (shortSqueeze.length + highCash.length === 0) {
    console.error("FAIL: Empty classification");
    process.exit(1);
  }

  const dupes = new Set<string>();
  for (const row of [...shortSqueeze, ...highCash]) {
    if (dupes.has(row.ticker)) {
      console.error(`FAIL: Duplicate ticker across columns: ${row.ticker}`);
      process.exit(1);
    }
    dupes.add(row.ticker);
  }

  console.log("\nPASS: Full scan pipeline OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

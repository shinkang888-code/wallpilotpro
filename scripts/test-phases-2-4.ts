/**
 * Phase 2–4 smoke tests — run: npm run test:phases-2-4
 */
import { runMiniDebate } from "../src/lib/agents/debate.server.ts";
import { buildDeepAgentReport } from "../src/lib/agents/deep-report.server.ts";
import { riskGateBeforeOrder } from "../src/lib/agents/risk-gate.server.ts";
import { fetchMarketSnapshot } from "../src/lib/api/market-data.server.ts";
import { fetchNewsHeadlines } from "../src/lib/api/news-data.server.ts";
import { isSupabaseConfigured } from "../src/lib/db/supabase.server.ts";
import { runDecisionReflection } from "../src/lib/db/reflection.server.ts";
import { toStockRow } from "../src/lib/quant/classify.server.ts";
import { calculateValuation } from "../src/lib/quant/valuation.server.ts";
import { isPortfolioRating } from "../src/lib/types/rating.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("=== Phase 2–4 tests ===\n");

  const snapshot = await fetchMarketSnapshot({ ticker: "NVDA", market: "US", name: "NVIDIA" });
  assert(snapshot != null, "NVDA snapshot");
  const valuation = calculateValuation(snapshot!);
  const news = await fetchNewsHeadlines(snapshot!.ticker, snapshot!.market, 3);

  const debate = await runMiniDebate({
    snapshot: snapshot!,
    valuation,
    news,
    initialRating: "Hold",
  });
  assert(debate.bullCase.length > 10, "bull case");
  assert(isPortfolioRating(debate.rating), `debate rating ${debate.rating}`);
  console.log(`Debate rating: ${debate.rating}`);

  const row = toStockRow({
    snapshot: snapshot!,
    valuation,
    catalysts: ["test"],
    rating: debate.rating,
    debate,
  });
  const risk = await riskGateBeforeOrder(row, { krw: 10_000_000, usd: 5000 });
  assert(typeof risk.approved === "boolean", "risk approved boolean");
  console.log(`Risk gate: approved=${risk.approved}`);

  const deep = await buildDeepAgentReport("AAPL");
  assert(deep.debate && deep.riskGate && deep.markdown.length > 50, "deep report");
  console.log(`Deep report source: ${deep.source}`);

  console.log(`Supabase configured: ${isSupabaseConfigured()}`);
  const reflection = await runDecisionReflection(1);
  console.log(`Reflection batch: scanned=${reflection.scanned} updated=${reflection.updated}`);

  console.log("\nPASS: Phase 2–4 modules OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

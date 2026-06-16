/**
 * Phase 1 — technical + news + 5-tier rating
 * Run: npm run test:phase1
 */
import { geminiAnalyzeStock } from "../src/lib/api/gemini-analyze.server.ts";
import { fetchNewsHeadlines } from "../src/lib/api/news-data.server.ts";
import { fetchMarketSnapshot } from "../src/lib/api/market-data.server.ts";
import { computeTechnicalIndicators } from "../src/lib/quant/technical.server.ts";
import { calculateValuation } from "../src/lib/quant/valuation.server.ts";
import { isPortfolioRating } from "../src/lib/types/rating.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("=== Phase 1: technical + news + rating ===\n");

  const closes = Array.from({ length: 40 }, (_, i) => 100 + i * 0.5 + Math.sin(i / 3) * 2);
  const tech = computeTechnicalIndicators({ closes, price: closes.at(-1)! });
  assert(tech.rsi14 != null && tech.rsi14 > 0 && tech.rsi14 < 100, "RSI in range");
  assert(tech.macdHistogram != null, "MACD histogram");
  assert(tech.bollingerPctB != null, "Bollinger %B");
  console.log(`Technical: ${tech.label}`);

  const snapshot = await fetchMarketSnapshot({ ticker: "AAPL", market: "US", name: "Apple" });
  assert(snapshot != null, "AAPL snapshot");
  assert(snapshot!.technical != null, "snapshot has technical");
  console.log(`AAPL technical: ${snapshot!.technical!.label}`);

  const news = await fetchNewsHeadlines("AAPL", "US", 3);
  console.log(`News headlines: ${news.length}`);
  if (news.length > 0) console.log(`  → ${news[0].title}`);

  const valuation = calculateValuation(snapshot!);
  const analysis = await geminiAnalyzeStock(snapshot!, valuation, { news });
  assert(isPortfolioRating(analysis.rating), `valid rating: ${analysis.rating}`);
  assert(analysis.bull_catalysts.length >= 1, "bull catalysts");
  console.log(`Rating: ${analysis.rating}`);
  console.log(`Catalysts: ${analysis.bull_catalysts[0]}`);

  console.log("\nPASS: Phase 1 modules OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

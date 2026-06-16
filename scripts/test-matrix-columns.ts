/**
 * Matrix column size test — run: npm run test:matrix-columns
 */
import { classifyRows, type AnalyzedRow } from "../src/lib/quant/classify.server.ts";
import { MATRIX_COLUMN_SIZE } from "../src/lib/quant/matrix-config.ts";
import { buildUniverse } from "../src/lib/quant/universe.server.ts";

function mockRow(ticker: string, momentum: number, cash = 0.12): AnalyzedRow {
  return {
    snapshot: {
      ticker,
      name: ticker,
      market: /^\d/.test(ticker) ? "KR" : "US",
      currency: /^\d/.test(ticker) ? "KRW" : "USD",
      price: 100,
      change30dPct: momentum,
      volume: 1_000_000,
      avgVolume20d: 400_000,
      peRatio: 15,
      roe: 20,
      operatingMargin: 15,
      epsGrowth: 12,
      cashToMcap: cash,
    },
    valuation: {
      intrinsicValue: 120,
      marginOfSafetyPct: 10,
      pegRatio: 0.9,
      quantitativeGrade: "Pass",
      buyingZoneLow: 95,
      buyingZoneHigh: 99,
      profitTarget: 130,
      hardStop: 90,
      volPrediction: "120%",
      momentum,
      lynchScore: 60,
      greenblattScore: 70,
      lynchRecommendation: "Buy",
      greenblattRecommendation: "Buy",
      greenblattGrade: "B",
      guruBadges: [],
      supplyLabel: null,
    },
    catalysts: ["test"],
    rating: "Hold",
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  const universe = buildUniverse({ toss: true, thirteenF: true, quant: true });
  assert(universe.length >= MATRIX_COLUMN_SIZE * 2, `universe pool ${universe.length} >= ${MATRIX_COLUMN_SIZE * 2}`);

  const analyzed = universe.map((u, i) =>
    mockRow(u.ticker, i % 2 === 0 ? 45 : 15, i % 3 === 0 ? 0.2 : 0.08),
  );
  const { shortSqueeze, highCash } = classifyRows(analyzed);

  assert(shortSqueeze.length === MATRIX_COLUMN_SIZE, `short squeeze ${shortSqueeze.length}`);
  assert(highCash.length === MATRIX_COLUMN_SIZE, `high cash ${highCash.length}`);

  const dupes = new Set<string>();
  for (const r of [...shortSqueeze, ...highCash]) {
    assert(!dupes.has(r.ticker), `duplicate ${r.ticker}`);
    dupes.add(r.ticker);
  }

  console.log(`PASS: ${MATRIX_COLUMN_SIZE} + ${MATRIX_COLUMN_SIZE} columns, universe ${universe.length}`);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

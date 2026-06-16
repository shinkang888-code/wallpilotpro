/**
 * Integration test — wall street report pipeline (KR + US).
 * Run: npm run test:wall-report
 */
import { buildWallStreetReport } from "../src/lib/quant/wall-street-report.server.ts";

async function main() {
  console.log("=== Wall Street Report integration ===\n");

  for (const ticker of ["005930", "NVDA"]) {
    console.log(`Building report: ${ticker}...`);
    const report = await buildWallStreetReport(ticker);
    console.log(`  ${report.name} (${report.market})`);
    console.log(`  Lynch ${report.lynch.recommendation} PEG=${report.lynch.pegRatio}`);
    console.log(`  Greenblatt ${report.greenblatt.recommendation} grade=${report.greenblatt.investmentGrade}`);
    console.log(`  Supply: ${report.supply.label}`);
    console.log(`  Combined: ${report.combined.recommendation} fair=${report.combined.fairValue}`);
    if (!report.combined.fairValue || report.catalysts.length === 0) {
      throw new Error(`Invalid report for ${ticker}`);
    }
  }

  console.log("\nPASS: wall street report OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

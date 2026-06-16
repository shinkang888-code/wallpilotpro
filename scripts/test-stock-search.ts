/**
 * Stock search & resolver tests — run: npm run test:stock-search
 */
import { resolveStockInput, searchStocks } from "../src/lib/api/stock-search.server.ts";
import { buildWallStreetReport } from "../src/lib/quant/wall-street-report.server.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function main() {
  console.log("=== Stock search tests ===\n");

  const krByCode = await searchStocks("005930", 5);
  assert(krByCode.some((r) => r.ticker === "005930"), "KR code search: 005930");

  const krByRoman = await searchStocks("Samsung", 5);
  assert(krByRoman.some((r) => r.ticker === "005930"), "KR romanized search: Samsung");
  console.log(`Samsung → ${krByRoman.find((r) => r.ticker === "005930")?.name}`);

  const usByName = await searchStocks("Apple", 5);
  assert(usByName.some((r) => r.ticker === "AAPL"), "US name search: Apple");
  console.log(`Apple → ${usByName.find((r) => r.ticker === "AAPL")?.name}`);

  const hynix = await resolveStockInput("000660");
  assert(hynix.ticker === "000660" && hynix.market === "KR", "resolve 000660");
  assert(!hynix.ticker.includes("AAPL"), "000660 must not resolve to AAPL");
  console.log(`000660 resolved: ${hynix.name} (${hynix.ticker})`);

  const kosdaq = await resolveStockInput("196170");
  assert(kosdaq.market === "KR", "KOSDAQ 196170 KR market");
  console.log(`196170 알테오젠: ${kosdaq.yahooSymbol}`);

  const report = await buildWallStreetReport("000660");
  assert(report.ticker === "000660", `report ticker must be 000660, got ${report.ticker}`);
  assert(report.name.toLowerCase().includes("하이닉스") || report.name.toLowerCase().includes("sk"), "SK hynix name");
  console.log(`Report: ${report.name} (${report.ticker})`);

  const usReport = await buildWallStreetReport("MSFT");
  assert(usReport.ticker === "MSFT" && usReport.market === "US", "MSFT US report");
  console.log(`Report: ${usReport.name} (${usReport.ticker})`);

  console.log("\nPASS: stock search OK");
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

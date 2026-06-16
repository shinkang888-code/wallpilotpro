/**
 * Verify korea-stock-analyzer-mcp HTTP backend.
 * Run: npx tsx scripts/test-mcp-connection.ts
 */
import { getServerConfig } from "../src/lib/config.server.ts";
import { fetchKrFinancial, fetchKrSupplyDemand } from "../src/lib/api/korea-stock-mcp.server.ts";

async function main() {
  const { koreaStockMcpUrl } = getServerConfig();
  console.log(`MCP URL: ${koreaStockMcpUrl}\n`);

  const financial = await fetchKrFinancial("005930");
  const supply = await fetchKrSupplyDemand("005930");

  console.log("Financial:", financial ? `PER=${financial.metrics.per} EPS=${financial.metrics.eps}` : "null (API unavailable)");
  console.log("Supply:", supply ? JSON.stringify(supply.netAmountByInvestor) : "null (API unavailable)");

  if (!financial && !supply) {
    console.log("\nWARN: MCP HTTP backend unreachable — volume fallback active in enrichment.");
    console.log("Deploy korea-stock-analyzer-mcp to Vercel or set KOREA_STOCK_MCP_URL.");
    process.exit(0);
  }
  console.log("\nPASS: MCP connection OK");
}

main();

/** Quick Freqtrade connection test — run: npx tsx scripts/test-freqtrade-connection.ts */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] ??= val;
  }
}

const { probeFreqtradeConnection, fetchFtBotStatus, fetchFtProfit } = await import(
  "../src/lib/modules/ft/ft-client.server.ts"
);

const connection = await probeFreqtradeConnection();
console.log("Connection:", JSON.stringify(connection, null, 2));

if (connection.online) {
  const status = await fetchFtBotStatus();
  const profit = await fetchFtProfit();
  console.log("Status:", JSON.stringify(status, null, 2));
  console.log("Profit:", JSON.stringify(profit, null, 2));
  console.log("\nOK — WallPilot can sync with Freqtrade.");
} else {
  console.error("\nFAIL — Start bot: cd ../freqtrade && .\\scripts\\start-bot.ps1");
  process.exit(1);
}

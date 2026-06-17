/** Verify TradeMaster worker URL responds to WallPilot healthcheck. */
const base = process.env.TRADEMASTER_SERVICE_URL ?? "http://127.0.0.1:8089";

async function main() {
  const url = `${base.replace(/\/$/, "")}/api/TradeMaster/healthcheck`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as { error_code?: number };
  if (json.error_code !== 0) throw new Error(`error_code=${json.error_code}`);
  console.log("PASS: TradeMaster worker online at", base);
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});

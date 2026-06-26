/** Verify TradingAgents sidecar URL responds to /health. */
const base = process.env.TRADINGAGENTS_SERVICE_URL ?? "https://wallpilot-tradingagents-api.onrender.com";
const url = `${base.replace(/\/$/, "")}/health`;

const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
if (!res.ok) throw new Error(`health_http_${res.status}`);
const json = (await res.json()) as { status?: string };
if (json.status !== "ok") throw new Error(`health_bad_status:${JSON.stringify(json)}`);
console.log(`✓ TradingAgents sidecar online: ${url}`);

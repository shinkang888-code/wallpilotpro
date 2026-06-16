const UA = { "User-Agent": "Mozilla/5.0 WallPilot/1.0" };

/** Live USD/KRW — how many KRW per 1 USD (Yahoo Finance KRW=X). */
export async function fetchUsdKrwRate(): Promise<number> {
  const url =
    "https://query1.finance.yahoo.com/v8/finance/chart/KRW=X?interval=1d&range=5d";
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(12_000) });
  if (!res.ok) throw new Error("fx_unreachable");

  const json = (await res.json()) as {
    chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> };
  };
  const rate = json.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!rate || rate < 800 || rate > 2500) {
    throw new Error("fx_invalid");
  }
  return rate;
}

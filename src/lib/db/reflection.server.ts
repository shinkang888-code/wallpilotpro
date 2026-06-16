import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: { regularMarketPrice?: number };
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

async function fetchCurrentPrice(symbol: string): Promise<number | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 WallPilot/1.0" },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as YahooChart;
    return json.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
  } catch {
    return null;
  }
}

function yahooSymbol(ticker: string, market: string): string {
  if (market === "KR") {
    const code = ticker.replace(/\.KS$|\.KQ$/, "");
    return `${code}.KS`;
  }
  return ticker.replace(".", "-");
}

/** Phase 4 — batch reflect: N-day return vs price_at_decision. */
export async function runDecisionReflection(minAgeDays = 5): Promise<{
  scanned: number;
  updated: number;
}> {
  if (!isSupabaseConfigured()) return { scanned: 0, updated: 0 };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { scanned: 0, updated: 0 };

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - minAgeDays);

  const { data: rows, error } = await supabase
    .from("decision_log")
    .select("id, ticker, market, price_at_decision")
    .is("outcome_pct", null)
    .not("price_at_decision", "is", null)
    .lt("created_at", cutoff.toISOString())
    .limit(50);

  if (error || !rows?.length) return { scanned: 0, updated: 0 };

  let updated = 0;
  for (const row of rows) {
    const price = await fetchCurrentPrice(yahooSymbol(row.ticker, row.market));
    if (price == null || !row.price_at_decision) continue;
    const outcomePct = ((price - row.price_at_decision) / row.price_at_decision) * 100;
    const { error: upErr } = await supabase
      .from("decision_log")
      .update({
        outcome_pct: Math.round(outcomePct * 100) / 100,
        reflected_at: new Date().toISOString(),
      })
      .eq("id", row.id);
    if (!upErr) updated += 1;
  }

  return { scanned: rows.length, updated };
}

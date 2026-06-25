import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import { fetchLivePrice } from "@/lib/market/price-provider.server";

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
    const market = row.market === "KR" ? "KR" : "US";
    const live = await fetchLivePrice(row.ticker, market);
    const price = live?.price ?? null;
    if (price == null || !row.price_at_decision) continue;
    const outcomePct = ((price - row.price_at_decision) / row.price_at_decision) * 100;
    const { error: upErr } = await supabase
      .from("decision_log")
      .update({ outcome_pct: outcomePct })
      .eq("id", row.id);
    if (!upErr) updated++;
  }

  return { scanned: rows.length, updated };
}

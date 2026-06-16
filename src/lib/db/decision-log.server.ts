import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import type { PortfolioRating } from "@/lib/types/rating";
import type { Market } from "@/lib/types/stock";

export type DecisionEventType = "scan" | "order" | "deep_report" | "risk_gate";

export type DecisionLogEntry = {
  ticker: string;
  market: Market;
  eventType: DecisionEventType;
  rating?: PortfolioRating | null;
  priceAtDecision?: number | null;
  bullCase?: string | null;
  bearCase?: string | null;
  riskApproved?: boolean | null;
  metadata?: Record<string, unknown>;
};

export async function logDecision(entry: DecisionLogEntry): Promise<{ ok: boolean; id?: string }> {
  if (!isSupabaseConfigured()) return { ok: false };

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false };

  const { data, error } = await supabase
    .from("decision_log")
    .insert({
      ticker: entry.ticker,
      market: entry.market,
      event_type: entry.eventType,
      rating: entry.rating ?? null,
      price_at_decision: entry.priceAtDecision ?? null,
      bull_case: entry.bullCase ?? null,
      bear_case: entry.bearCase ?? null,
      risk_approved: entry.riskApproved ?? null,
      metadata: entry.metadata ?? {},
    })
    .select("id")
    .single();

  if (error) return { ok: false };
  return { ok: true, id: data.id as string };
}

export async function logDecisionBatch(entries: DecisionLogEntry[]): Promise<number> {
  if (!isSupabaseConfigured() || entries.length === 0) return 0;
  const supabase = getSupabaseAdmin();
  if (!supabase) return 0;

  const rows = entries.map((e) => ({
    ticker: e.ticker,
    market: e.market,
    event_type: e.eventType,
    rating: e.rating ?? null,
    price_at_decision: e.priceAtDecision ?? null,
    bull_case: e.bullCase ?? null,
    bear_case: e.bearCase ?? null,
    risk_approved: e.riskApproved ?? null,
    metadata: e.metadata ?? {},
  }));

  const { error } = await supabase.from("decision_log").insert(rows);
  return error ? 0 : rows.length;
}

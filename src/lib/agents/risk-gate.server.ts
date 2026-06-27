import { z } from "zod";

import { callGeminiJson } from "@/lib/api/gemini-json.server";
import { computeOrderQty } from "@/lib/order-sizing";
import type { RiskGateResult } from "@/lib/types/agent";
import { isBearishRating } from "@/lib/types/rating";
import type { StockRow } from "@/lib/types/stock";

export type { RiskGateResult } from "@/lib/types/agent";

const riskSchema = z.object({
  aggressive_view: z.string().min(10).max(280),
  conservative_view: z.string().min(10).max(280),
  approved: z.boolean(),
  reason: z.string().min(5).max(300),
});

function codeRiskGate(
  row: StockRow,
  wallet: { krw: number; usd: number } | null,
): RiskGateResult {
  const balance = row.currency === "USD" ? (wallet?.usd ?? 0) : (wallet?.krw ?? 0);
  const qty = computeOrderQty(row, wallet);
  const notional = qty * row.price;

  if (isBearishRating(row.rating)) {
    return {
      approved: false,
      reason: `Portfolio rating ${row.rating} — block automatic execution.`,
      aggressiveView: "High-conviction dip entry if catalysts play out within 30 days.",
      conservativeView: "Bearish rating violates risk policy; wait for re-rating or margin improvement.",
    };
  }

  if (balance > 0 && notional > balance * 0.05) {
    return {
      approved: false,
      reason: `Order notional exceeds 5% of wallet (${row.currency}).`,
      aggressiveView: "Concentrated bet may maximize alpha if thesis is correct.",
      conservativeView: "Position size breaches single-name concentration guardrail.",
    };
  }

  if (row.momentum < 0) {
    return {
      approved: false,
      reason: "Negative 30D momentum — wait for trend confirmation.",
      aggressiveView: "Contrarian entry before momentum turns.",
      conservativeView: "Falling knife risk; hard stop may trigger quickly.",
    };
  }

  return {
    approved: true,
    reason: "Risk checks passed — proceed with split-limit execution.",
    aggressiveView: "Sizing within 2% risk budget; upside skew acceptable.",
    conservativeView: "Hard stop and buying zone contain downside; approve with monitoring.",
  };
}

/** Aggressive vs Conservative gate before Toss execute (WallPilot risk committee). */
export async function riskGateBeforeOrder(
  row: StockRow,
  wallet: { krw: number; usd: number } | null,
): Promise<RiskGateResult> {
  const codeResult = codeRiskGate(row, wallet);

  const prompt = `You are a risk committee (Aggressive + Conservative analysts) reviewing a Toss order.
Ticker: ${row.ticker} (${row.name}) · Rating: ${row.rating}
Price: ${row.price} ${row.currency} · Momentum: ${row.momentum}
Buying zone: ${row.buyingZone} · Hard stop: ${row.hardStop}
Wallet ${row.currency}: ${row.currency === "USD" ? (wallet?.usd ?? 0) : (wallet?.krw ?? 0)}
Code gate: approved=${codeResult.approved} reason="${codeResult.reason}"

Return JSON:
{"aggressive_view":"2 sentences max","conservative_view":"2 sentences max","approved":true,"reason":"..."}
- approved must respect code gate (if code=false, approved must be false).
- Use plain prose, no markdown.`;

  const raw = await callGeminiJson(
    prompt,
    riskSchema,
    {
      aggressive_view: codeResult.aggressiveView,
      conservative_view: codeResult.conservativeView,
      approved: codeResult.approved,
      reason: codeResult.reason,
    },
    { temperature: 0.1 },
  );

  const approved = codeResult.approved ? raw.approved : false;

  return {
    approved,
    reason: approved ? raw.reason : codeResult.reason,
    aggressiveView: raw.aggressive_view.trim(),
    conservativeView: raw.conservative_view.trim(),
  };
}

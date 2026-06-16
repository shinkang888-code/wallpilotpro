import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { riskGateBeforeOrder } from "@/lib/agents/risk-gate.server";
import { logDecision } from "@/lib/db/decision-log.server";
import type { StockRow } from "@/lib/types/stock";

const input = z.object({
  row: z.custom<StockRow>(),
  wallet: z
    .object({
      krw: z.number(),
      usd: z.number(),
    })
    .nullable(),
});

export const evaluateRiskGate = createServerFn({ method: "POST" })
  .inputValidator(input)
  .handler(async ({ data }) => {
    const result = await riskGateBeforeOrder(data.row, data.wallet);
    void logDecision({
      ticker: data.row.ticker,
      market: data.row.market,
      eventType: "risk_gate",
      rating: data.row.rating,
      priceAtDecision: data.row.price,
      riskApproved: result.approved,
      metadata: {
        reason: result.reason,
        aggressive: result.aggressiveView,
        conservative: result.conservativeView,
      },
    });
    return result;
  });

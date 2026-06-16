import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { logDecision } from "@/lib/db/decision-log.server";
import type { StockRow } from "@/lib/types/stock";

export const logOrderDecision = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      row: z.custom<StockRow>(),
      orderOk: z.boolean(),
    }),
  )
  .handler(async ({ data }) => {
    const result = await logDecision({
      ticker: data.row.ticker,
      market: data.row.market,
      eventType: "order",
      rating: data.row.rating,
      priceAtDecision: data.row.price,
      bullCase: data.row.debate?.bullCase ?? null,
      bearCase: data.row.debate?.bearCase ?? null,
      riskApproved: data.orderOk,
      metadata: { verdict: data.row.debate?.verdict },
    });
    return result;
  });

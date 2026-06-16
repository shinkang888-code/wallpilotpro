import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  fetchTossQuote,
  fetchTossWallet,
  placeSplitLimitOrder,
} from "@/lib/api/toss-bridge.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";

export const getTossWallet = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(1) }))
  .handler(async ({ data }) => fetchTossWallet(data.accessToken));

export const getTossQuote = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
      ticker: z.string().min(1),
      market: z.enum(["KR", "US"]),
    }),
  )
  .handler(async ({ data }) =>
    fetchTossQuote(data.accessToken, data.ticker, data.market),
  );

const orderInput = z.object({
  accessToken: z.string().min(1),
  authAccessToken: z.string().nullable().optional(),
  ticker: z.string().min(1),
  market: z.enum(["KR", "US"]),
  totalQty: z.number().int().positive(),
  zoneLow: z.number().positive(),
  zoneHigh: z.number().positive(),
});

export const executeSplitLimitOrder = createServerFn({ method: "POST" })
  .inputValidator(orderInput)
  .handler(async ({ data }) => {
    await guardFeature(data.authAccessToken, "toss_execute");
    return placeSplitLimitOrder(data.accessToken, {
      ticker: data.ticker,
      market: data.market,
      totalQty: data.totalQty,
      zoneLow: data.zoneLow,
      zoneHigh: data.zoneHigh,
      splits: [3, 3, 4],
    });
  });

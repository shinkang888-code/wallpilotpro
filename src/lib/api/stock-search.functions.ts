import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { searchStocks, resolveKrStockInput, searchKrStocks } from "@/lib/api/stock-search.server";

export const searchStockSymbols = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data }) => searchStocks(data.query, data.limit ?? 12));

export const searchKrStockSymbols = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data }) => searchKrStocks(data.query, data.limit ?? 12));

export const resolveKrStockCode = createServerFn({ method: "POST" })
  .inputValidator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data }) => resolveKrStockInput(data.query));

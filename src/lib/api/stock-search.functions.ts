import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { searchStocks } from "@/lib/api/stock-search.server";

export const searchStockSymbols = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      query: z.string().min(1),
      limit: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data }) => searchStocks(data.query, data.limit ?? 12));

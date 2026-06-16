import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { generateStrategyAdvice } from "@/lib/api/strategy-advice.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import type { StockRow } from "@/lib/types/stock";

export const getStrategyAdvice = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      row: z.custom<StockRow>(),
      accessToken: z.string().nullable().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    await guardFeature(data.accessToken, "strategy_advice");
    return generateStrategyAdvice(data.row, data.geminiApiKey);
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { enrichAiPilotPicks } from "@/lib/ai-pilot/yahoo-pick-metrics.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";

const pickSchema = z.object({
  rank: z.number(),
  ticker: z.string(),
  name: z.string(),
  market: z.enum(["KR", "US"]),
  priceBand: z.string(),
  entryBand: z.string(),
  stopLoss: z.string(),
  targetPrice: z.string(),
  catalystTimeline: z.string(),
  thesis: z.string(),
  cashFlowNote: z.string(),
  matchPoints: z.array(z.string()),
});

export const enrichAiPilotPicksFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      lang: z.enum(["ko", "en"]),
      picks: z.array(pickSchema).min(1).max(15),
    }),
  )
  .handler(async ({ data }) => {
    await guardFeature(data.accessToken, "ai_pilot");
    const enriched = await enrichAiPilotPicks(data.picks, data.lang);
    return enriched ?? data.picks;
  });

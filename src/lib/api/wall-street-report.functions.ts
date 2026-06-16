import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import { buildWallStreetReport } from "@/lib/quant/wall-street-report.server";
import type { WallStreetReport } from "@/lib/types/stock";

const reportInput = z.object({
  ticker: z.string().min(1),
  name: z.string().optional(),
  accessToken: z.string().nullable().optional(),
  ...clientGeminiKeySchema.shape,
});

export const generateWallStreetReport = createServerFn({ method: "POST" })
  .inputValidator(reportInput)
  .handler(async ({ data }): Promise<WallStreetReport> => {
    await guardFeature(data.accessToken, "wall_report");
    return buildWallStreetReport(data.ticker, data.name, { geminiApiKey: data.geminiApiKey });
  });

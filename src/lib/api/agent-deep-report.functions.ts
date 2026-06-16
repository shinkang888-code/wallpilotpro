import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { buildDeepAgentReport } from "@/lib/agents/deep-report.server";
import { logDecision } from "@/lib/db/decision-log.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import type { DeepAgentReport } from "@/lib/types/stock";

export const generateDeepAgentReport = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticker: z.string().min(1),
      accessToken: z.string().nullable().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }): Promise<DeepAgentReport> => {
    await guardFeature(data.accessToken, "wall_report");
    const report = await buildDeepAgentReport(data.ticker, data.geminiApiKey);
    void logDecision({
      ticker: report.ticker,
      market: report.market,
      eventType: "deep_report",
      rating: report.rating,
      priceAtDecision: report.price,
      bullCase: report.debate.bullCase,
      bearCase: report.debate.bearCase,
      riskApproved: report.riskGate.approved,
      metadata: { source: report.source, verdict: report.debate.verdict },
    });
    return report;
  });

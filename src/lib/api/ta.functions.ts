import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { buildDeepAgentReport } from "@/lib/agents/deep-report.server";
import { logDecision } from "@/lib/db/decision-log.server";
import { logUserActivity } from "@/lib/db/activity-log.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import type { DeepAgentReport } from "@/lib/types/stock";

export const runAgentDeskAnalysis = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticker: z.string().min(1),
      accessToken: z.string().nullable().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }): Promise<DeepAgentReport> => {
    const session = await guardFeature(data.accessToken, "agent_desk");
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
      metadata: { source: report.source, module: "ta.desk", verdict: report.debate.verdict },
    });

    void logUserActivity({
      userId: session.user.id,
      eventType: "feature_execute",
      menuId: "agent_desk",
      detail: { ticker: report.ticker, source: report.source },
    });

    return report;
  });

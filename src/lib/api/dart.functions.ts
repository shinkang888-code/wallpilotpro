import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import { logUserActivity } from "@/lib/db/activity-log.server";
import { runDartLabAnalysis } from "@/lib/modules/dart/dart-lab.server";
import { isOpenDartConfigured } from "@/lib/modules/dart/opendart.server";
import { getServerConfig } from "@/lib/config.server";
import { isGeminiKeyAvailable, resolveGeminiKeySource } from "@/lib/gemini/resolve-gemini-key.server";
import type { DartLabAnalysis } from "@/lib/modules/dart/types";

export const getDartLabStatus = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    const { dartlabServiceUrl } = getServerConfig();
    return {
      opendartConfigured: isOpenDartConfigured(),
      dartlabSidecarConfigured: Boolean(dartlabServiceUrl),
      geminiConfigured: isGeminiKeyAvailable(data.geminiApiKey),
      geminiSource: resolveGeminiKeySource(data.geminiApiKey),
    };
  });

export const analyzeDartLab = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      stockCode: z.string().min(4),
      accessToken: z.string().nullable().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }): Promise<DartLabAnalysis> => {
    const session = await guardFeature(data.accessToken, "dart_lab");
    const result = await runDartLabAnalysis(data.stockCode, data.geminiApiKey);

    if (session) {
      void logUserActivity({
        userId: session.user.id,
        eventType: "feature_execute",
        menuId: "dart_lab",
        detail: { stockCode: result.stockCode, source: result.source },
      });
    }

    return result;
  });

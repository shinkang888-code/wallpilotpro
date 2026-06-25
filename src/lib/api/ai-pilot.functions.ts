import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { runAiPilotChat } from "@/lib/api/ai-pilot.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import type { StockRow } from "@/lib/types/stock";

const chatInput = z.object({
  accessToken: z.string().nullable().optional(),
  tossKey: z.string().nullable().optional(),
  ...clientGeminiKeySchema.shape,
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ),
  lang: z.enum(["ko", "en"]),
  scanContext: z
    .object({
      shortSqueeze: z.array(z.custom<StockRow>()),
      highCash: z.array(z.custom<StockRow>()),
    })
    .nullable()
    .optional(),
});

export const chatAiPilot = createServerFn({ method: "POST" })
  .inputValidator(chatInput)
  .handler(async ({ data }) => {
    await guardFeature(data.accessToken, "ai_pilot", { geminiApiKey: data.geminiApiKey });
    return runAiPilotChat(data);
  });

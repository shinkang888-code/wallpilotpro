import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { vercelOverrideSchema } from "@/lib/api/connect-vercel-overrides";
import {
  connectGeminiToVercel,
  getGeminiConnectionStatus,
  verifyGeminiApiKey,
} from "@/lib/api/gemini-connect.server";

const statusInput = vercelOverrideSchema.partial().merge(clientGeminiKeySchema);

export const getGeminiStatus = createServerFn({ method: "POST" })
  .inputValidator(statusInput)
  .handler(async ({ data }) => {
    const { geminiApiKey, ...overrides } = data;
    return getGeminiConnectionStatus(overrides, geminiApiKey);
  });

export const testGeminiApiKey = createServerFn({ method: "POST" })
  .inputValidator(z.object({ apiKey: z.string().min(20) }))
  .handler(async ({ data }) => verifyGeminiApiKey(data.apiKey));

const connectInput = z.object({
  apiKey: z.string().min(20),
  setupSecret: z.string().optional(),
  triggerRedeploy: z.boolean().optional(),
  ...vercelOverrideSchema.shape,
});

export const connectGemini = createServerFn({ method: "POST" })
  .inputValidator(connectInput)
  .handler(async ({ data }) => connectGeminiToVercel(data));

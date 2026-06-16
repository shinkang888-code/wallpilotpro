import { z } from "zod";

export const clientGeminiKeySchema = z.object({
  geminiApiKey: z.string().min(20).optional(),
});

export type ClientGeminiKeyInput = z.infer<typeof clientGeminiKeySchema>;

import { z } from "zod";

export const vercelOverrideSchema = z.object({
  vercelAccessToken: z.string().min(20).optional(),
  vercelProjectId: z.string().min(10).optional(),
  vercelTeamId: z.string().optional(),
});

export type ConnectVercelOverrides = z.infer<typeof vercelOverrideSchema>;

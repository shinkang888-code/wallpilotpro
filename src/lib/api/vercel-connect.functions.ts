import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  connectVercelCredentials,
  getVercelConnectionStatus,
  listVercelProjects,
  verifyVercelAccessToken,
} from "@/lib/api/vercel-connect.server";

export const getVercelStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => getVercelConnectionStatus());

export const testVercelToken = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      teamId: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const verify = await verifyVercelAccessToken(data.accessToken);
    if (!verify.ok) {
      return { ok: false as const, message: verify.message, username: undefined, projects: [] };
    }
    const listed = await listVercelProjects(data.accessToken, data.teamId?.trim() || undefined);
    return {
      ok: true as const,
      message: verify.message,
      username: verify.username,
      projects: listed.projects,
    };
  });

const connectInput = z.object({
  accessToken: z.string().min(20),
  projectId: z.string().min(10),
  teamId: z.string().optional(),
  setupSecret: z.string().optional(),
  triggerRedeploy: z.boolean().optional(),
});

export const connectVercel = createServerFn({ method: "POST" })
  .inputValidator(connectInput)
  .handler(async ({ data }) => connectVercelCredentials(data));

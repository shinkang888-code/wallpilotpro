import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { vercelOverrideSchema } from "@/lib/api/connect-vercel-overrides";
import {
  connectGoogleAuthToVercel,
  getGoogleAuthConnectionStatus,
  verifyGoogleAuthCredentials,
} from "@/lib/api/google-auth-connect.server";

export const getGoogleAuthStatus = createServerFn({ method: "POST" })
  .inputValidator(vercelOverrideSchema.partial())
  .handler(async ({ data }) => getGoogleAuthConnectionStatus(data));

export const testGoogleAuthCredentials = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      clientId: z.string().min(10),
      clientSecret: z.string().min(12),
      redirectUri: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => verifyGoogleAuthCredentials(data));

const connectInput = z.object({
  clientId: z.string().min(10),
  clientSecret: z.string().min(12),
  redirectUri: z.string().optional(),
  setupSecret: z.string().optional(),
  triggerRedeploy: z.boolean().optional(),
  ...vercelOverrideSchema.shape,
});

export const connectGoogleAuth = createServerFn({ method: "POST" })
  .inputValidator(connectInput)
  .handler(async ({ data }) => connectGoogleAuthToVercel(data));

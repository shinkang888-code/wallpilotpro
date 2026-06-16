import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { vercelOverrideSchema } from "@/lib/api/connect-vercel-overrides";
import {
  connectSupabaseToVercel,
  getSupabaseConnectionStatus,
  verifySupabaseCredentials,
} from "@/lib/api/supabase-connect.server";

export const getSupabaseStatus = createServerFn({ method: "POST" })
  .inputValidator(vercelOverrideSchema.partial())
  .handler(async ({ data }) => getSupabaseConnectionStatus(data));

const connectInput = z.object({
  supabaseUrl: z.string().min(10),
  serviceRoleKey: z.string().min(20),
  setupSecret: z.string().optional(),
  triggerRedeploy: z.boolean().optional(),
  ...vercelOverrideSchema.shape,
});

export const connectSupabase = createServerFn({ method: "POST" })
  .inputValidator(connectInput)
  .handler(async ({ data }) => connectSupabaseToVercel(data));

export const testSupabaseCredentials = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      supabaseUrl: z.string().min(10),
      serviceRoleKey: z.string().min(20),
    }),
  )
  .handler(async ({ data }) => verifySupabaseCredentials(data.supabaseUrl, data.serviceRoleKey));

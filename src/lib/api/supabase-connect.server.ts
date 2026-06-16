import process from "node:process";

import { createClient } from "@supabase/supabase-js";

import type { VercelCredentialOverrides } from "@/lib/integrations/vercel-credentials.server";
import { resolveVercelCredentials } from "@/lib/integrations/vercel-credentials.server";
import { getServerConfig } from "@/lib/config.server";
import { isSupabaseConfigured, resetSupabaseClient } from "@/lib/db/supabase.server";
import { triggerVercelRedeploy, upsertVercelEnvVar } from "@/lib/integrations/vercel-env.server";

export type SupabaseConnectionStatus = {
  configured: boolean;
  canSyncToVercel: boolean;
  vercelProjectId: string | null;
};

export type SupabaseConnectResult = {
  ok: boolean;
  message: string;
  redeployStarted?: boolean;
};

const SUPABASE_URL_PATTERN = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i;

export function getSupabaseConnectionStatus(
  overrides?: VercelCredentialOverrides,
): SupabaseConnectionStatus {
  const vercel = resolveVercelCredentials(overrides);
  const { vercelProjectId } = getServerConfig();
  return {
    configured: isSupabaseConfigured(),
    canSyncToVercel: Boolean(vercel),
    vercelProjectId: (vercel?.projectId ?? vercelProjectId) || null,
  };
}

export async function verifySupabaseCredentials(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<{ ok: boolean; message: string }> {
  const url = supabaseUrl.trim().replace(/\/$/, "");
  if (!SUPABASE_URL_PATTERN.test(url)) {
    return { ok: false, message: "invalid_supabase_url" };
  }
  if (!serviceRoleKey.trim() || serviceRoleKey.trim().length < 20) {
    return { ok: false, message: "invalid_service_role_key" };
  }

  try {
    const client = createClient(url, serviceRoleKey.trim(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.from("decision_log").select("id").limit(1);
    if (error?.code === "PGRST301" || error?.message?.toLowerCase().includes("jwt")) {
      return { ok: false, message: "invalid_service_role_key" };
    }
    // Table missing is OK — credentials still valid
    return { ok: true, message: "verified" };
  } catch {
    return { ok: false, message: "supabase_unreachable" };
  }
}

export async function connectSupabaseToVercel(input: {
  supabaseUrl: string;
  serviceRoleKey: string;
  setupSecret?: string;
  triggerRedeploy?: boolean;
  vercelAccessToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
}): Promise<SupabaseConnectResult> {
  const cfg = getServerConfig();

  if (cfg.wallpilotSetupSecret) {
    if (!input.setupSecret || input.setupSecret !== cfg.wallpilotSetupSecret) {
      return { ok: false, message: "setup_secret_required" };
    }
  }

  const vercel = resolveVercelCredentials(input);
  if (!vercel) {
    return { ok: false, message: "vercel_not_configured" };
  }

  const verify = await verifySupabaseCredentials(input.supabaseUrl, input.serviceRoleKey);
  if (!verify.ok) {
    return { ok: false, message: verify.message };
  }

  const url = input.supabaseUrl.trim().replace(/\/$/, "");
  const key = input.serviceRoleKey.trim();

  for (const envKey of ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const) {
    const value = envKey === "SUPABASE_URL" ? url : key;
    const saved = await upsertVercelEnvVar({
      token: vercel.token,
      projectId: vercel.projectId,
      teamId: vercel.teamId,
      key: envKey,
      value,
    });
    if (!saved.ok) {
      return { ok: false, message: saved.message };
    }
  }

  // Hot-reload for current server process (local dev / until redeploy)
  process.env.SUPABASE_URL = url;
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  resetSupabaseClient();

  let redeployStarted = false;
  if (input.triggerRedeploy !== false) {
    const redeploy = await triggerVercelRedeploy({
      token: vercel.token,
      projectId: vercel.projectId,
      teamId: vercel.teamId,
    });
    redeployStarted = redeploy.ok;
  }

  return {
    ok: true,
    message: redeployStarted ? "saved_and_redeploying" : "saved",
    redeployStarted,
  };
}

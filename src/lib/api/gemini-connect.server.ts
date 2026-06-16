import process from "node:process";

import type { VercelCredentialOverrides } from "@/lib/integrations/vercel-credentials.server";
import { resolveVercelCredentials } from "@/lib/integrations/vercel-credentials.server";
import { getServerConfig } from "@/lib/config.server";
import {
  isUsableGeminiKey,
  pickGeminiKeySource,
  type GeminiKeySource,
} from "@/lib/gemini/gemini-key-resolution";
// isUsableGeminiKey rejects empty/placeholder env values
import { triggerVercelRedeploy, upsertVercelEnvVar } from "@/lib/integrations/vercel-env.server";

export type GeminiConnectionStatus = {
  configured: boolean;
  canSyncToVercel: boolean;
  vercelProjectId: string | null;
  activeSource: GeminiKeySource;
};

export type GeminiConnectResult = {
  ok: boolean;
  message: string;
  redeployStarted?: boolean;
};

export function isGeminiConfigured(): boolean {
  return isUsableGeminiKey(getServerConfig().geminiApiKey);
}

export function getGeminiConnectionStatus(
  overrides?: VercelCredentialOverrides,
  clientKey?: string | null,
): GeminiConnectionStatus {
  const vercel = resolveVercelCredentials(overrides);
  const { geminiApiKey, vercelProjectId } = getServerConfig();
  const configured = isUsableGeminiKey(geminiApiKey);
  return {
    configured,
    canSyncToVercel: Boolean(vercel),
    vercelProjectId: (vercel?.projectId ?? vercelProjectId) || null,
    activeSource: pickGeminiKeySource(geminiApiKey, clientKey),
  };
}

export async function verifyGeminiApiKey(apiKey: string): Promise<{ ok: boolean; message: string }> {
  const key = apiKey.trim();
  if (!isUsableGeminiKey(key)) {
    return { ok: false, message: "invalid_gemini_key" };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash?key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(12_000) });
    if (res.status === 400 || res.status === 403 || res.status === 401) {
      return { ok: false, message: "invalid_gemini_key" };
    }
    if (!res.ok) {
      return { ok: false, message: "gemini_unreachable" };
    }
    return { ok: true, message: "verified" };
  } catch {
    return { ok: false, message: "gemini_unreachable" };
  }
}

export async function connectGeminiToVercel(input: {
  apiKey: string;
  setupSecret?: string;
  triggerRedeploy?: boolean;
  vercelAccessToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
}): Promise<GeminiConnectResult> {
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

  const key = input.apiKey.trim();
  const verify = await verifyGeminiApiKey(key);
  if (!verify.ok) {
    return { ok: false, message: verify.message };
  }

  const saved = await upsertVercelEnvVar({
    token: vercel.token,
    projectId: vercel.projectId,
    teamId: vercel.teamId,
    key: "GEMINI_API_KEY",
    value: key,
  });
  if (!saved.ok) {
    return { ok: false, message: saved.message };
  }

  process.env.GEMINI_API_KEY = key;

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

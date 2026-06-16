import process from "node:process";

import type { VercelCredentialOverrides } from "@/lib/integrations/vercel-credentials.server";
import { resolveVercelCredentials } from "@/lib/integrations/vercel-credentials.server";
import { getServerConfig } from "@/lib/config.server";
import { triggerVercelRedeploy, upsertVercelEnvVar } from "@/lib/integrations/vercel-env.server";

export type GoogleAuthConnectionStatus = {
  configured: boolean;
  canSyncToVercel: boolean;
  vercelProjectId: string | null;
  redirectUri: string | null;
};

export type GoogleAuthConnectResult = {
  ok: boolean;
  message: string;
  redeployStarted?: boolean;
};

const CLIENT_ID_PATTERN =
  /^[\d]+-[\w-]+\.apps\.googleusercontent\.com$|^[\w.-]+\.apps\.googleusercontent\.com$/i;

export function isGoogleAuthConfigured(): boolean {
  const { googleClientId, googleClientSecret } = getServerConfig();
  return Boolean(googleClientId && googleClientSecret);
}

export function getGoogleAuthConnectionStatus(
  overrides?: VercelCredentialOverrides,
): GoogleAuthConnectionStatus {
  const cfg = getServerConfig();
  const vercel = resolveVercelCredentials(overrides);
  return {
    configured: isGoogleAuthConfigured(),
    canSyncToVercel: Boolean(vercel),
    vercelProjectId: (vercel?.projectId ?? cfg.vercelProjectId) || null,
    redirectUri: cfg.googleAuthRedirectUri || null,
  };
}

export async function verifyGoogleAuthCredentials(input: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
}): Promise<{ ok: boolean; message: string }> {
  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  const redirectUri = input.redirectUri?.trim();

  if (!clientId || !CLIENT_ID_PATTERN.test(clientId)) {
    return { ok: false, message: "invalid_google_client_id" };
  }
  if (!clientSecret || clientSecret.length < 12) {
    return { ok: false, message: "invalid_google_client_secret" };
  }
  if (redirectUri) {
    try {
      const url = new URL(redirectUri);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return { ok: false, message: "invalid_redirect_uri" };
      }
    } catch {
      return { ok: false, message: "invalid_redirect_uri" };
    }
  }

  try {
    const probeUri =
      redirectUri || "https://wallpilot.vercel.app/auth/callback/google";
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", probeUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "openid email profile");
    const res = await fetch(authUrl.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
    });
    // Google redirects (302) or returns login page (200) for valid client_id
    if (res.status === 400 || res.status === 404) {
      return { ok: false, message: "invalid_google_client_id" };
    }
    return { ok: true, message: "verified" };
  } catch {
    return { ok: true, message: "verified" };
  }
}

async function saveEnv(
  token: string,
  projectId: string,
  teamId: string | undefined,
  key: string,
  value: string,
): Promise<{ ok: boolean; message: string }> {
  return upsertVercelEnvVar({ token, projectId, teamId, key, value });
}

export async function connectGoogleAuthToVercel(input: {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  setupSecret?: string;
  triggerRedeploy?: boolean;
  vercelAccessToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
}): Promise<GoogleAuthConnectResult> {
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

  const verify = await verifyGoogleAuthCredentials(input);
  if (!verify.ok) {
    return { ok: false, message: verify.message };
  }

  const clientId = input.clientId.trim();
  const clientSecret = input.clientSecret.trim();
  const redirectUri = input.redirectUri?.trim() || "";

  const entries: Array<[string, string]> = [
    ["GOOGLE_CLIENT_ID", clientId],
    ["GOOGLE_CLIENT_SECRET", clientSecret],
  ];
  if (redirectUri) {
    entries.push(["GOOGLE_AUTH_REDIRECT_URI", redirectUri]);
  }

  for (const [key, value] of entries) {
    const saved = await saveEnv(vercel.token, vercel.projectId, vercel.teamId, key, value);
    if (!saved.ok) {
      return { ok: false, message: saved.message };
    }
  }

  process.env.GOOGLE_CLIENT_ID = clientId;
  process.env.GOOGLE_CLIENT_SECRET = clientSecret;
  if (redirectUri) {
    process.env.GOOGLE_AUTH_REDIRECT_URI = redirectUri;
  }

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

import process from "node:process";

import { getServerConfig } from "@/lib/config.server";
import { isVercelSyncReady } from "@/lib/integrations/vercel-credentials.server";
import {
  listVercelProjects,
  triggerVercelRedeploy,
  upsertVercelEnvVar,
  verifyVercelAccessToken,
  verifyVercelProjectAccess,
} from "@/lib/integrations/vercel-env.server";

export type VercelConnectionStatus = {
  configured: boolean;
  tokenConfigured: boolean;
  projectId: string | null;
  teamId: string | null;
};

export type VercelConnectResult = {
  ok: boolean;
  message: string;
  redeployStarted?: boolean;
};

export function getVercelConnectionStatus(): VercelConnectionStatus {
  const cfg = getServerConfig();
  return {
    configured: Boolean(cfg.vercelAccessToken && cfg.vercelProjectId),
    tokenConfigured: Boolean(cfg.vercelAccessToken),
    projectId: cfg.vercelProjectId || null,
    teamId: cfg.vercelTeamId || null,
  };
}

export async function connectVercelCredentials(input: {
  accessToken: string;
  projectId: string;
  teamId?: string;
  setupSecret?: string;
  triggerRedeploy?: boolean;
}): Promise<VercelConnectResult> {
  const cfg = getServerConfig();

  if (cfg.wallpilotSetupSecret) {
    if (!input.setupSecret || input.setupSecret !== cfg.wallpilotSetupSecret) {
      return { ok: false, message: "setup_secret_required" };
    }
  }

  const token = input.accessToken.trim();
  const projectId = input.projectId.trim();
  const teamId = input.teamId?.trim() || undefined;

  const userCheck = await verifyVercelAccessToken(token);
  if (!userCheck.ok) {
    return { ok: false, message: userCheck.message };
  }

  const projectCheck = await verifyVercelProjectAccess(token, projectId, teamId);
  if (!projectCheck.ok) {
    return { ok: false, message: projectCheck.message };
  }

  const envEntries: Array<[string, string]> = [
    ["VERCEL_ACCESS_TOKEN", token],
    ["VERCEL_PROJECT_ID", projectId],
  ];
  if (teamId) {
    envEntries.push(["VERCEL_TEAM_ID", teamId]);
  }

  for (const [key, value] of envEntries) {
    const saved = await upsertVercelEnvVar({
      token,
      projectId,
      teamId,
      key,
      value,
    });
    if (!saved.ok) {
      return { ok: false, message: saved.message };
    }
  }

  process.env.VERCEL_ACCESS_TOKEN = token;
  process.env.VERCEL_PROJECT_ID = projectId;
  if (teamId) process.env.VERCEL_TEAM_ID = teamId;

  let redeployStarted = false;
  if (input.triggerRedeploy !== false) {
    const redeploy = await triggerVercelRedeploy({ token, projectId, teamId });
    redeployStarted = redeploy.ok;
  }

  return {
    ok: true,
    message: redeployStarted ? "saved_and_redeploying" : "saved",
    redeployStarted,
  };
}

export { listVercelProjects, verifyVercelAccessToken, isVercelSyncReady };

import { getServerConfig } from "@/lib/config.server";

export type VercelCredentialOverrides = {
  vercelAccessToken?: string;
  vercelProjectId?: string;
  vercelTeamId?: string;
};

export type ResolvedVercelCredentials = {
  token: string;
  projectId: string;
  teamId?: string;
};

export function resolveVercelCredentials(
  overrides?: VercelCredentialOverrides,
): ResolvedVercelCredentials | null {
  const cfg = getServerConfig();
  const token = (overrides?.vercelAccessToken ?? cfg.vercelAccessToken).trim();
  const projectId = (overrides?.vercelProjectId ?? cfg.vercelProjectId).trim();
  const teamId = (overrides?.vercelTeamId ?? cfg.vercelTeamId).trim() || undefined;
  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

export function isVercelSyncReady(overrides?: VercelCredentialOverrides): boolean {
  return resolveVercelCredentials(overrides) !== null;
}

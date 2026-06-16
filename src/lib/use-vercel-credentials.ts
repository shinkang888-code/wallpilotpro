import { useCallback, useEffect, useMemo, useState } from "react";

import type { VercelCredentialOverrides } from "@/lib/integrations/vercel-credentials.server";

const STORAGE = {
  token: "wallpilot-vercel-token",
  projectId: "wallpilot-vercel-project-id",
  teamId: "wallpilot-vercel-team-id",
} as const;

function read(key: string) {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(key) ?? "";
}

export function useVercelCredentials() {
  const [token, setTokenState] = useState("");
  const [projectId, setProjectIdState] = useState("");
  const [teamId, setTeamIdState] = useState("");

  useEffect(() => {
    setTokenState(read(STORAGE.token));
    setProjectIdState(read(STORAGE.projectId));
    setTeamIdState(read(STORAGE.teamId));
  }, []);

  const setToken = useCallback((value: string) => {
    setTokenState(value);
    if (value) localStorage.setItem(STORAGE.token, value);
    else localStorage.removeItem(STORAGE.token);
  }, []);

  const setProjectId = useCallback((value: string) => {
    setProjectIdState(value);
    if (value) localStorage.setItem(STORAGE.projectId, value);
    else localStorage.removeItem(STORAGE.projectId);
  }, []);

  const setTeamId = useCallback((value: string) => {
    setTeamIdState(value);
    if (value) localStorage.setItem(STORAGE.teamId, value);
    else localStorage.removeItem(STORAGE.teamId);
  }, []);

  const persist = useCallback(
    (creds: { accessToken: string; projectId: string; teamId?: string }) => {
      setToken(creds.accessToken);
      setProjectId(creds.projectId);
      setTeamId(creds.teamId ?? "");
    },
    [setToken, setProjectId, setTeamId],
  );

  const clear = useCallback(() => {
    setToken("");
    setProjectId("");
    setTeamId("");
  }, [setToken, setProjectId, setTeamId]);

  const hasLocalCreds = Boolean(token.trim() && projectId.trim());

  const overrides: VercelCredentialOverrides | undefined = useMemo(() => {
    if (!hasLocalCreds) return undefined;
    return {
      vercelAccessToken: token.trim(),
      vercelProjectId: projectId.trim(),
      vercelTeamId: teamId.trim() || undefined,
    };
  }, [hasLocalCreds, token, projectId, teamId]);

  return {
    token,
    setToken,
    projectId,
    setProjectId,
    teamId,
    setTeamId,
    persist,
    clear,
    hasLocalCreds,
    overrides,
  };
}

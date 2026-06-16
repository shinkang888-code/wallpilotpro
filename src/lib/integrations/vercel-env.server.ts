const VERCEL_API = "https://api.vercel.com";

type VercelEnvEntry = { id: string; key: string };

export type VercelEnvTarget = "production" | "preview" | "development";

function teamQuery(teamId?: string) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

export async function vercelFetch(path: string, token: string, init?: RequestInit) {
  return fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(20_000),
  });
}

/** Upsert encrypted env var on linked Vercel project (production + preview + development). */
export async function upsertVercelEnvVar(opts: {
  token: string;
  projectId: string;
  teamId?: string;
  key: string;
  value: string;
  targets?: VercelEnvTarget[];
}): Promise<{ ok: boolean; message: string }> {
  const targets = opts.targets ?? ["production", "preview", "development"];
  const q = teamQuery(opts.teamId);

  const listRes = await vercelFetch(`/v9/projects/${opts.projectId}/env${q}`, opts.token);
  if (!listRes.ok) {
    return { ok: false, message: `Vercel env list failed (${listRes.status})` };
  }

  const list = (await listRes.json()) as { envs?: VercelEnvEntry[] };
  const existing = (list.envs ?? []).filter((e) => e.key === opts.key);
  for (const env of existing) {
    await vercelFetch(`/v9/projects/${opts.projectId}/env/${env.id}${q}`, opts.token, {
      method: "DELETE",
    });
  }

  const createRes = await vercelFetch(`/v10/projects/${opts.projectId}/env${q}`, opts.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: opts.key,
      value: opts.value,
      type: "encrypted",
      target: targets,
    }),
  });

  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => "");
    return { ok: false, message: `Vercel env save failed (${createRes.status})${detail ? `: ${detail.slice(0, 120)}` : ""}` };
  }

  return { ok: true, message: "saved" };
}

/** Trigger redeploy so new env vars take effect on Vercel. */
export async function triggerVercelRedeploy(opts: {
  token: string;
  projectId: string;
  teamId?: string;
}): Promise<{ ok: boolean; message: string; deploymentId?: string }> {
  const q = teamQuery(opts.teamId);
  const listRes = await vercelFetch(
    `/v6/deployments?projectId=${encodeURIComponent(opts.projectId)}&limit=1${opts.teamId ? `&teamId=${encodeURIComponent(opts.teamId)}` : ""}`,
    opts.token,
  );
  if (!listRes.ok) {
    return { ok: false, message: `Vercel deployments list failed (${listRes.status})` };
  }

  const list = (await listRes.json()) as { deployments?: Array<{ uid: string }> };
  const latest = list.deployments?.[0]?.uid;
  if (!latest) {
    return { ok: false, message: "No deployment found to redeploy" };
  }

  const redeployRes = await vercelFetch(`/v13/deployments${q}`, opts.token, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deploymentId: latest,
      name: opts.projectId,
    }),
  });

  if (!redeployRes.ok) {
    const detail = await redeployRes.text().catch(() => "");
    return {
      ok: false,
      message: `Redeploy failed (${redeployRes.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
    };
  }

  const body = (await redeployRes.json()) as { id?: string };
  return { ok: true, message: "redeploy_started", deploymentId: body.id };
}

export async function verifyVercelAccessToken(
  token: string,
): Promise<{ ok: boolean; message: string; username?: string }> {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 20) {
    return { ok: false, message: "invalid_vercel_token" };
  }

  const res = await vercelFetch("/v2/user", trimmed);
  if (res.status === 401 || res.status === 403) {
    return { ok: false, message: "invalid_vercel_token" };
  }
  if (!res.ok) {
    return { ok: false, message: "vercel_unreachable" };
  }

  const user = (await res.json()) as { user?: { username?: string } };
  return { ok: true, message: "verified", username: user.user?.username };
}

export async function listVercelProjects(
  token: string,
  teamId?: string,
): Promise<{ ok: boolean; message: string; projects: Array<{ id: string; name: string }> }> {
  const verify = await verifyVercelAccessToken(token);
  if (!verify.ok) {
    return { ok: false, message: verify.message, projects: [] };
  }

  const q = teamQuery(teamId);
  const res = await vercelFetch(`/v9/projects${q}`, token.trim());
  if (!res.ok) {
    return { ok: false, message: "vercel_projects_failed", projects: [] };
  }

  const body = (await res.json()) as { projects?: Array<{ id: string; name: string }> };
  const projects = (body.projects ?? []).map((p) => ({ id: p.id, name: p.name }));
  return { ok: true, message: "ok", projects };
}

export async function verifyVercelProjectAccess(
  token: string,
  projectId: string,
  teamId?: string,
): Promise<{ ok: boolean; message: string; projectName?: string }> {
  const q = teamQuery(teamId);
  const res = await vercelFetch(`/v9/projects/${encodeURIComponent(projectId)}${q}`, token.trim());
  if (res.status === 404) {
    return { ok: false, message: "invalid_vercel_project" };
  }
  if (!res.ok) {
    return { ok: false, message: "vercel_unreachable" };
  }
  const body = (await res.json()) as { name?: string };
  return { ok: true, message: "verified", projectName: body.name };
}


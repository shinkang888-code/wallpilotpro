/**
 * Pull Vercel development environment variables into .env.local
 *
 * Requires:
 *   VERCEL_TOKEN or VERCEL_ACCESS_TOKEN
 *   VERCEL_PROJECT_ID (optional — auto-discovers project named "wallpilot")
 *   VERCEL_TEAM_ID (optional)
 *
 * Usage:
 *   npx tsx scripts/pull-vercel-env.ts
 *   npx tsx scripts/pull-vercel-env.ts --environment=production
 */

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const VERCEL_API = "https://api.vercel.com";
const DEFAULT_PROJECT_NAME = "wallpilot";
const DEFAULT_OUT = resolve(process.cwd(), ".env.local");

type PullResponse = {
  env?: Record<string, string>;
  error?: { message?: string };
};

function teamQuery(teamId?: string) {
  return teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
}

async function vercelFetch(path: string, token: string, init?: RequestInit) {
  const res = await fetch(`${VERCEL_API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  return res;
}

async function resolveProjectId(
  token: string,
  projectId?: string,
  teamId?: string,
): Promise<string> {
  if (projectId?.trim()) return projectId.trim();

  const q = teamQuery(teamId);
  const res = await vercelFetch(`/v9/projects${q}`, token);
  if (!res.ok) {
    throw new Error(`Failed to list Vercel projects (${res.status})`);
  }

  const body = (await res.json()) as { projects?: Array<{ id: string; name: string }> };
  const match =
    body.projects?.find((p) => p.name === DEFAULT_PROJECT_NAME) ??
    body.projects?.find((p) => p.name.toLowerCase().includes("wallpilot"));

  if (!match) {
    throw new Error(
      `Project "${DEFAULT_PROJECT_NAME}" not found. Set VERCEL_PROJECT_ID explicitly.`,
    );
  }

  console.log(`Resolved project: ${match.name} (${match.id})`);
  return match.id;
}

async function pullEnv(
  token: string,
  projectId: string,
  environment: string,
  teamId?: string,
): Promise<Record<string, string>> {
  const q = teamQuery(teamId);
  const sep = q ? "&" : "?";
  const url = `/v3/env/pull/${projectId}/${encodeURIComponent(environment)}${q}${q ? "" : sep}source=wallpilot-cli-pull`;

  const res = await vercelFetch(url, token);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Vercel env pull failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const body = (await res.json()) as PullResponse;
  if (!body.env || Object.keys(body.env).length === 0) {
    throw new Error("No environment variables returned from Vercel.");
  }
  return body.env;
}

function toEnvFile(env: Record<string, string>): string {
  const header = [
    "# Pulled from Vercel — do not commit (see .gitignore)",
    `# Generated: ${new Date().toISOString()}`,
    "",
  ];
  const lines = Object.entries(env)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      const escaped = value.includes("\n") || value.includes('"') ? JSON.stringify(value) : value;
      return `${key}=${escaped}`;
    });
  return [...header, ...lines, ""].join("\n");
}

async function main() {
  const token = (process.env.VERCEL_TOKEN ?? process.env.VERCEL_ACCESS_TOKEN ?? "").trim();
  if (!token) {
    console.error(
      "Missing VERCEL_TOKEN or VERCEL_ACCESS_TOKEN.\n" +
        "Add a Vercel personal access token to Cloud Agent Secrets or export it locally,\n" +
        "then re-run: npx tsx scripts/pull-vercel-env.ts",
    );
    process.exit(1);
  }

  const envArg = process.argv.find((a) => a.startsWith("--environment="));
  const environment = envArg?.split("=")[1] ?? "development";
  const teamId = process.env.VERCEL_TEAM_ID?.trim() || undefined;

  const projectId = await resolveProjectId(token, process.env.VERCEL_PROJECT_ID, teamId);
  const env = await pullEnv(token, projectId, environment, teamId);

  // Ensure VITE_ client vars mirror server Supabase vars when present
  if (env.SUPABASE_URL && !env.VITE_SUPABASE_URL) {
    env.VITE_SUPABASE_URL = env.SUPABASE_URL;
  }
  if (env.SUPABASE_ANON_KEY && !env.VITE_SUPABASE_ANON_KEY) {
    env.VITE_SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY;
  }
  if (env.VITE_SUPABASE_ANON_KEY && !env.SUPABASE_ANON_KEY) {
    env.SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
  }

  writeFileSync(DEFAULT_OUT, toEnvFile(env), "utf-8");
  console.log(`Wrote ${Object.keys(env).length} variables to ${DEFAULT_OUT} (${environment})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});

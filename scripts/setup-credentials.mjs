/**
 * One-shot WallPilot credential setup from user export files.
 *
 * Usage:
 *   node scripts/setup-credentials.mjs \
 *     "C:/path/wallpilot google_supa.txt" \
 *     "C:/path/wallpilotjson.json" \
 *     "C:/path/wallpilot-499209-ed5c9bc44206.json"
 *
 * Options:
 *   --vercel-cli   Sync env to linked Vercel project via CLI (requires vercel login)
 *   --supabase     Enable Google provider on Supabase via Management API (requires supabase login)
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, unlinkSync } from "node:fs";
import { resolve, basename } from "node:path";
import { execSync, spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const flags = new Set(process.argv.slice(2).filter((a) => a.startsWith("--")));
const txtPath = args[0];
const oauthJsonPath = args[1];
const serviceAccountPath = args[2];

if (!txtPath || !oauthJsonPath) {
  console.error(
    "Usage: node scripts/setup-credentials.mjs <google_supa.txt> <oauth-web.json> [service-account.json] [--vercel-cli] [--supabase]",
  );
  process.exit(1);
}

const PROJECT_REF = "dhqmswuslspaeabaxpxc";
const SITE_URL = "https://wallpilot.vercel.app";
const SUPABASE_CALLBACK = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;

function parseTxt(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out = {};

  function nextValue(startIdx) {
    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^https?:\/\//.test(line) || line.startsWith("eyJ") || line.startsWith("sb_")) return line;
      if (/^client id=/i.test(line)) return line.split("=").slice(1).join("=").trim();
      if (/^client secret/i.test(line)) return line.split("=").slice(1).join("=").trim();
    }
    return "";
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const label = raw.toLowerCase();
    if (label.includes("project url")) {
      out.SUPABASE_URL = nextValue(i).replace(/\/$/, "");
    } else if (label.includes("anon key")) {
      out.SUPABASE_ANON_KEY = nextValue(i);
    } else if (label.includes("service roll") || label.includes("service role")) {
      out.SUPABASE_SERVICE_ROLE_KEY = nextValue(i);
    } else if (label.startsWith("client id=")) {
      out.GOOGLE_CLIENT_ID = raw.split("=").slice(1).join("=").trim();
    } else if (label.startsWith("client secret")) {
      out.GOOGLE_CLIENT_SECRET = raw.split("=").slice(1).join("=").trim();
    }
  }
  return out;
}

function parseOAuthJson(path) {
  const json = JSON.parse(readFileSync(path, "utf8"));
  const web = json.web ?? json.installed ?? json;
  return {
    GOOGLE_CLIENT_ID: web.client_id ?? "",
    GOOGLE_CLIENT_SECRET: web.client_secret ?? "",
    redirectUris: web.redirect_uris ?? [],
  };
}

function upsertEnvFile(envPath, entries) {
  const existing = existsSync(envPath) ? readFileSync(envPath, "utf8").split(/\r?\n/) : ["# WallPilot local env"];
  const seen = new Set();
  const out = [];

  for (const line of existing) {
    if (!line || line.startsWith("#")) {
      out.push(line);
      continue;
    }
    const eq = line.indexOf("=");
    if (eq === -1) {
      out.push(line);
      continue;
    }
    const key = line.slice(0, eq).trim();
    if (key in entries) {
      out.push(`${key}="${entries[key]}"`);
      seen.add(key);
    } else {
      out.push(line);
    }
  }

  for (const [key, value] of Object.entries(entries)) {
    if (!seen.has(key)) out.push(`${key}="${value}"`);
  }

  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  writeFileSync(envPath, out.join("\n") + "\n");
}

function loadEnvMap(envPath) {
  const map = new Map();
  if (!existsSync(envPath)) return map;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    map.set(k, v);
  }
  return map;
}

const VERCEL_TARGETS = ["production", "preview", "development"];

function getVercelAccessToken() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const paths = [
    resolve(home, ".local/share/com.vercel.cli/auth.json"),
    resolve(home, "AppData/Roaming/xdg.data/com.vercel.cli/auth.json"),
    resolve(home, "AppData/Roaming/com.vercel.cli/auth.json"),
  ];
  for (const p of paths) {
    if (!existsSync(p)) continue;
    try {
      const data = JSON.parse(readFileSync(p, "utf8"));
      if (data.token) return String(data.token).trim();
    } catch {
      /* ignore */
    }
  }
  return process.env.VERCEL_ACCESS_TOKEN?.trim() ?? "";
}

function getVercelProjectMeta() {
  const projectPath = resolve(process.cwd(), ".vercel/project.json");
  const repoPath = resolve(process.cwd(), ".vercel/repo.json");
  if (existsSync(projectPath)) {
    const j = JSON.parse(readFileSync(projectPath, "utf8"));
    return { projectId: j.projectId ?? j.id ?? "", teamId: j.orgId ?? j.teamId ?? "" };
  }
  if (existsSync(repoPath)) {
    const j = JSON.parse(readFileSync(repoPath, "utf8"));
    const p = j.projects?.[0];
    if (p) return { projectId: p.id ?? "", teamId: p.orgId ?? "" };
  }
  return { projectId: "", teamId: "" };
}

function vercelEnvAddCli(key, value) {
  const bin = process.platform === "win32" ? "vercel.cmd" : "vercel";
  let ok = true;
  for (const target of VERCEL_TARGETS) {
    const result = spawnSync(bin, ["env", "add", key, target, "--value", value, "--yes", "--force"], {
      encoding: "utf8",
      stdio: "pipe",
      cwd: process.cwd(),
      shell: true,
    });
    if (result.status !== 0) {
      const detail = (result.stderr || result.stdout || "").trim();
      console.error(`Vercel CLI: failed ${key} (${target}):`, detail.slice(0, 300));
      ok = false;
    }
  }
  if (ok) console.log(`Vercel CLI: synced ${key} -> ${VERCEL_TARGETS.join(", ")}`);
  return ok;
}

async function vercelEnvUpsertApi(key, value, projectId, teamId, token) {
  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
  const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`, { headers });
  if (!listRes.ok) throw new Error(`list failed ${key} (${listRes.status})`);
  const list = await listRes.json();
  for (const env of (list.envs ?? []).filter((e) => e.key === key)) {
    await fetch(`https://api.vercel.com/v9/projects/${projectId}/env/${env.id}${teamQuery}`, {
      method: "DELETE",
      headers,
    });
  }
  const createRes = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env${teamQuery}`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      key,
      value,
      type: "encrypted",
      target: VERCEL_TARGETS,
    }),
  });
  if (!createRes.ok) {
    const detail = await createRes.text().catch(() => "");
    throw new Error(`save failed ${key} (${createRes.status}): ${detail.slice(0, 120)}`);
  }
  console.log(`Vercel API: synced ${key} -> ${VERCEL_TARGETS.join(", ")}`);
}

async function syncVercelFromEnvFile(envPath) {
  const map = loadEnvMap(envPath);
  const keys = [...map.keys()].filter((k) => k && !k.startsWith("VERCEL_"));
  const { projectId, teamId } = getVercelProjectMeta();
  const token = getVercelAccessToken();
  const synced = [];

  for (const key of keys) {
    const val = map.get(key);
    if (!val) continue;
    let done = vercelEnvAddCli(key, val);
    if (!done && token && projectId) {
      try {
        await vercelEnvUpsertApi(key, val, projectId, teamId, token);
        done = true;
      } catch (e) {
        console.error(`Vercel API: failed ${key}:`, e.message);
      }
    }
    if (done) synced.push(key);
  }
  return synced;
}

function getSupabaseAccessToken() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "";
  const paths = [
    resolve(home, ".supabase/access-token"),
    resolve(home, "AppData/Roaming/supabase/access-token"),
  ];
  for (const p of paths) {
    if (existsSync(p)) return readFileSync(p, "utf8").trim();
  }
  return "";
}

async function configureSupabaseGoogle(clientId, clientSecret) {
  const token = getSupabaseAccessToken();
  if (!token) {
    console.warn("Supabase: no access token — run `npx supabase login` and retry with --supabase");
    return false;
  }

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      site_url: SITE_URL,
      uri_allow_list: `${SITE_URL}/**,http://localhost:8080/**,http://localhost:5173/**`,
      external_google_enabled: true,
      external_google_client_id: clientId,
      external_google_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    console.error(`Supabase auth config failed (${res.status}):`, detail.slice(0, 300));
    return false;
  }

  console.log("Supabase: Google provider enabled + redirect URLs updated");
  return true;
}

async function main() {
  const txt = readFileSync(txtPath, "utf8");
  const fromTxt = parseTxt(txt);
  const fromJson = parseOAuthJson(oauthJsonPath);

  const entries = {
    ...fromTxt,
    GOOGLE_CLIENT_ID: fromJson.GOOGLE_CLIENT_ID || fromTxt.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: fromJson.GOOGLE_CLIENT_SECRET || fromTxt.GOOGLE_CLIENT_SECRET,
    VITE_SUPABASE_URL: fromTxt.SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: fromTxt.SUPABASE_ANON_KEY,
    AUTH_ENFORCE: "true",
    AUTH_AUTO_APPROVE: "true",
    AUTH_SITE_URL: SITE_URL,
    GOOGLE_AUTH_REDIRECT_URI: `${SITE_URL}/auth/callback`,
  };

  if (!entries.SUPABASE_URL || !entries.SUPABASE_ANON_KEY || !entries.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase keys in txt export");
    process.exit(1);
  }
  if (!entries.GOOGLE_CLIENT_ID || !entries.GOOGLE_CLIENT_SECRET) {
    console.error("Missing Google OAuth client id/secret");
    process.exit(1);
  }

  const badRedirects = fromJson.redirectUris.filter((u) => u.includes("/0auth/"));
  if (badRedirects.length > 0) {
    console.warn(
      "WARN: OAuth JSON has typo redirect /0auth/ — Supabase sign-in needs this URI in Google Cloud:",
      SUPABASE_CALLBACK,
    );
  }

  const envPath = resolve(process.cwd(), ".env.local");
  upsertEnvFile(envPath, entries);
  console.log("Updated .env.local");

  if (serviceAccountPath && existsSync(serviceAccountPath)) {
    const secretsDir = resolve(process.cwd(), "secrets");
    mkdirSync(secretsDir, { recursive: true });
    const dest = resolve(secretsDir, basename(serviceAccountPath));
    copyFileSync(serviceAccountPath, dest);
    upsertEnvFile(envPath, { GOOGLE_APPLICATION_CREDENTIALS: dest });
    console.log("Copied service account to secrets/ (gitignored)");
  }

  if (flags.has("--vercel-cli")) {
    try {
      execSync("vercel link --yes --project wallpilot", { stdio: "inherit" });
    } catch {
      /* already linked */
    }
    const synced = await syncVercelFromEnvFile(envPath);
    console.log("Vercel sync complete:", synced.length ? synced.join(", ") : "(none)");
  }

  if (flags.has("--supabase")) {
    await configureSupabaseGoogle(entries.GOOGLE_CLIENT_ID, entries.GOOGLE_CLIENT_SECRET);
  }

  console.log("\nNext: ensure Google Cloud OAuth client authorized redirect URIs include:");
  console.log(`  - ${SUPABASE_CALLBACK}`);
  console.log(`  - ${SITE_URL}/auth/callback (optional direct)`);
  console.log(`  - http://localhost:8080/auth/callback (local dev)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

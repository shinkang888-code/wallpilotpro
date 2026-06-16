/**
 * Parse Supabase credentials from a plain-text export and upsert into .env.local.
 * Usage: node scripts/apply-supabase-env.mjs "C:/path/to/supabase.txt"
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const sourcePath = process.argv[2];
if (!sourcePath) {
  console.error("Usage: node scripts/apply-supabase-env.mjs <path-to-txt>");
  process.exit(1);
}

const text = readFileSync(sourcePath, "utf8");
const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

function nextValue(startIdx) {
  for (let i = startIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (/^https?:\/\//.test(line) || line.startsWith("eyJ") || line.startsWith("sb_")) {
      return line;
    }
  }
  return "";
}

const parsed = {};
for (let i = 0; i < lines.length; i++) {
  const label = lines[i].toLowerCase();
  if (label.includes("project url") || label === "project url") {
    parsed.SUPABASE_URL = nextValue(i).replace(/\/$/, "");
  } else if (label.includes("anon key")) {
    parsed.SUPABASE_ANON_KEY = nextValue(i);
  } else if (label.includes("service roll") || label.includes("service role")) {
    parsed.SUPABASE_SERVICE_ROLE_KEY = nextValue(i);
  }
}

if (!parsed.SUPABASE_URL || !parsed.SUPABASE_ANON_KEY) {
  console.error("Could not parse SUPABASE_URL / anon key from source file.");
  process.exit(1);
}

parsed.VITE_SUPABASE_URL = parsed.SUPABASE_URL;
parsed.VITE_SUPABASE_ANON_KEY = parsed.SUPABASE_ANON_KEY;

const envPath = resolve(process.cwd(), ".env.local");
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
  if (key in parsed) {
    out.push(`${key}="${parsed[key]}"`);
    seen.add(key);
  } else {
    out.push(line);
  }
}

for (const [key, value] of Object.entries(parsed)) {
  if (!seen.has(key)) out.push(`${key}="${value}"`);
}

while (out.length > 0 && out[out.length - 1] === "") out.pop();
writeFileSync(envPath, out.join("\n") + "\n");

console.log("Updated .env.local:", Object.keys(parsed).join(", "));

if (process.argv.includes("--vercel")) {
  const envMap = new Map();
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    envMap.set(k, v);
  }

  const token = envMap.get("VERCEL_ACCESS_TOKEN");
  const projectId = envMap.get("VERCEL_PROJECT_ID");
  const teamId = envMap.get("VERCEL_TEAM_ID");
  if (!token || !projectId) {
    console.error("Missing VERCEL_ACCESS_TOKEN or VERCEL_PROJECT_ID in .env.local");
    process.exit(1);
  }

  const teamQuery = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

  async function upsertVercel(key, value) {
    const listRes = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env${teamQuery}`, {
      headers,
    });
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
        target: ["production", "preview", "development"],
      }),
    });
    if (!createRes.ok) {
      const detail = await createRes.text().catch(() => "");
      throw new Error(`save failed ${key} (${createRes.status}): ${detail.slice(0, 120)}`);
    }
  }

  for (const [key, value] of Object.entries(parsed)) {
    await upsertVercel(key, value);
    console.log(`Vercel: synced ${key}`);
  }
}

/**
 * After `vercel env pull`, mirror server Supabase vars into Vite public vars
 * so browser auth works in local dev without duplicating values manually.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env.local");
if (!existsSync(envPath)) {
  console.error("Missing .env.local — run: npm run vercel:env:pull");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const lines = raw.split(/\r?\n/);

function parseValue(line) {
  const eq = line.indexOf("=");
  if (eq === -1) return "";
  let v = line.slice(eq + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return v;
}

const map = new Map();
for (const line of lines) {
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  map.set(line.slice(0, eq).trim(), parseValue(line));
}

const supabaseUrl = map.get("SUPABASE_URL") ?? map.get("VITE_SUPABASE_URL") ?? "";
const anonKey = map.get("SUPABASE_ANON_KEY") ?? map.get("VITE_SUPABASE_ANON_KEY") ?? "";

const additions = [];
if (supabaseUrl && !map.has("VITE_SUPABASE_URL")) {
  additions.push(`VITE_SUPABASE_URL="${supabaseUrl}"`);
}
if (anonKey && !map.has("VITE_SUPABASE_ANON_KEY")) {
  additions.push(`VITE_SUPABASE_ANON_KEY="${anonKey}"`);
}

if (additions.length === 0) {
  console.log("Local env OK — no VITE_* mirrors needed.");
  process.exit(0);
}

const suffix = raw.endsWith("\n") ? "" : "\n";
writeFileSync(envPath, raw + suffix + additions.join("\n") + "\n");
console.log(`Updated .env.local with: ${additions.map((l) => l.split("=")[0]).join(", ")}`);

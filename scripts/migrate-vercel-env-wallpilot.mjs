#!/usr/bin/env node
/**
 * Copy legacy OSS-branded Vercel env vars to WALLPILOT_* names, then remove legacy keys.
 * Usage: node scripts/migrate-vercel-env-wallpilot.mjs [--dry-run] [--environment=production]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const envArg = args.find((a) => a.startsWith("--environment="));
const environment = envArg?.split("=")[1] ?? "production";

/** Old name → new WallPilot name (server). */
const SERVER_MAP = [
  ["TRADINGAGENTS_SERVICE_URL", "WALLPILOT_AGENT_SERVICE_URL"],
  ["TRADEMASTER_SERVICE_URL", "WALLPILOT_RL_SERVICE_URL"],
  ["AIT_SERVICE_URL", "WALLPILOT_SIGNAL_SERVICE_URL"],
  ["AI4TRADE_API_BASE", "WALLPILOT_SIGNAL_SERVICE_URL"],
  ["FREQTRADE_API_URL", "WALLPILOT_CRYPTO_API_URL"],
  ["FREQTRADE_API_USER", "WALLPILOT_CRYPTO_API_USER"],
  ["FREQTRADE_API_PASSWORD", "WALLPILOT_CRYPTO_API_PASSWORD"],
];

/** Old VITE_ client vars → new names. */
const CLIENT_MAP = [
  ["VITE_FREQTRADE_API_URL", "VITE_WALLPILOT_CRYPTO_API_URL"],
  ["VITE_FREQTRADE_API_USER", "VITE_WALLPILOT_CRYPTO_API_USER"],
  ["VITE_FREQTRADE_API_PASSWORD", "VITE_WALLPILOT_CRYPTO_API_PASSWORD"],
];

function run(cmd) {
  console.log(`> ${cmd}`);
  if (dryRun) return "";
  return execSync(cmd, { cwd: root, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function listRemoteKeys() {
  const raw = run(`vercel env ls ${environment}`);
  const keys = new Set();
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s+([A-Z0-9_]+)\s+/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function addEnv(name, value) {
  console.log(`> vercel env add ${name} ${environment}`);
  if (dryRun) return;
  // PowerShell pipe works reliably on Windows; spawn stdin does not.
  const quoted = value.replace(/'/g, "''");
  run(`powershell -NoProfile -Command "'${quoted}' | vercel env add ${name} ${environment}"`);
}

function removeEnv(name) {
  run(`vercel env rm ${name} ${environment} --yes`);
}

const tmpFile = path.join(root, `.env.vercel-migrate.${environment}.tmp`);
console.log(`Pulling ${environment} env vars…`);
if (!dryRun) {
  run(`vercel env pull "${tmpFile}" --environment=${environment} --yes`);
}

const local = parseEnvFile(tmpFile);
const remote = dryRun ? new Set(Object.keys(local)) : listRemoteKeys();

const planned = [];

for (const [oldKey, newKey] of [...SERVER_MAP, ...CLIENT_MAP]) {
  if (!(oldKey in local) && !remote.has(oldKey)) continue;
  const value = local[oldKey] ?? "";
  if (remote.has(newKey)) {
    console.log(`skip ${newKey} (already on Vercel)`);
    continue;
  }
  planned.push({ oldKey, newKey, value, hasValue: value.length > 0 });
}

if (planned.length === 0) {
  console.log("No legacy env vars to migrate.");
} else {
  console.log("\nPlanned migrations:");
  for (const p of planned) {
    console.log(`  ${p.oldKey} → ${p.newKey} ${p.hasValue ? "(has value)" : "(empty)"}`);
  }
}

if (!dryRun) {
  for (const p of planned) {
    addEnv(p.newKey, p.value);
    if (remote.has(p.oldKey)) {
      removeEnv(p.oldKey);
      console.log(`removed ${p.oldKey}`);
    }
  }
  if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
}

console.log(dryRun ? "\nDry run only — no changes applied." : "\nMigration complete.");

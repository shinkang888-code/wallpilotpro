/**
 * Auth / Google sign-in diagnostics — run: npx tsx scripts/diagnose-auth.ts
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { getAuthDiagnostics } from "../src/lib/auth/auth-diagnostics.server.ts";
import { getServerConfig } from "../src/lib/config.server.ts";

function loadEnvLocal() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function mask(value: string): string {
  if (!value) return "(empty)";
  if (value.length <= 12) return `${value.slice(0, 4)}…`;
  return `${value.slice(0, 8)}…${value.slice(-4)}`;
}

function main() {
  loadEnvLocal();
  const cfg = getServerConfig();
  const diag = getAuthDiagnostics();

  console.log("=== WallPilot Auth Diagnostics ===\n");
  console.log("Env presence (values masked):");
  console.log("  SUPABASE_URL:", mask(cfg.supabaseUrl));
  console.log("  SUPABASE_ANON_KEY:", mask(cfg.supabaseAnonKey));
  console.log("  SUPABASE_SERVICE_ROLE_KEY:", cfg.supabaseServiceRoleKey ? mask(cfg.supabaseServiceRoleKey) : "(MISSING)");
  console.log("  GEMINI_API_KEY:", cfg.geminiApiKey ? mask(cfg.geminiApiKey) : "(empty)");
  console.log("  AUTH_SITE_URL:", cfg.authSiteUrl || "(default)");
  console.log("  AUTH_AUTO_APPROVE:", cfg.authAutoApprove);
  console.log("  BOOTSTRAP_ADMIN_EMAIL:", cfg.bootstrapAdminEmail || "(none)");

  console.log("\nRuntime checks:");
  console.log(JSON.stringify(diag, null, 2));

  const blockers: string[] = [];
  if (!diag.supabaseBrowserConfigured) {
    blockers.push("Browser auth: set SUPABASE_URL + SUPABASE_ANON_KEY (and VITE_* mirrors for local dev).");
  }
  if (!diag.hasServiceRoleKey) {
    blockers.push("Server profiles: set SUPABASE_SERVICE_ROLE_KEY on Vercel (My API → Supabase).");
  }
  if (!diag.googleEnvConfigured) {
    blockers.push("Google OAuth env optional — Supabase Dashboard Google provider must be enabled with Client ID/Secret.");
  }

  console.log("\nLikely blockers:");
  if (blockers.length === 0) {
    console.log("  None detected from env. If sign-in still fails, verify Supabase redirect URLs:");
    console.log(`    App callback: ${diag.appCallbackUrl}`);
    console.log(`    Supabase OAuth callback (register in Google Cloud): ${diag.supabaseGoogleCallbackUrl}`);
  } else {
    for (const b of blockers) console.log(`  - ${b}`);
  }
}

main();

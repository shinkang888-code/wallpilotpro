/**
 * Promote a user to admin (active + elite subscription).
 *
 * Usage:
 *   node scripts/promote-admin.mjs shinkang888@gmail.com
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

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

async function main() {
  loadEnvLocal();
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: node scripts/promote-admin.mjs <email>");
    process.exit(1);
  }

  const url = process.env.SUPABASE_URL ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  if (!url || !service) {
    console.error("FAIL: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, role, account_status")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    console.error("FAIL:", error.message);
    process.exit(1);
  }
  if (!profile) {
    console.error(`FAIL: no profile for ${email} — sign in once with Google first.`);
    process.exit(1);
  }

  const now = new Date().toISOString();
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      role: "admin",
      account_status: "active",
      approved_at: now,
      updated_at: now,
    })
    .eq("id", profile.id);

  if (profileErr) {
    console.error("FAIL:", profileErr.message);
    process.exit(1);
  }

  const { error: subErr } = await admin.from("subscriptions").upsert({
    user_id: profile.id,
    plan: "elite",
    status: "active",
    updated_at: now,
  });

  if (subErr) {
    console.error("FAIL:", subErr.message);
    process.exit(1);
  }

  console.log(`OK: ${email} is now admin (elite, active).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

/**
 * Verify Supabase credentials — run: npx tsx scripts/verify-supabase-connection.ts
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
  const url = process.env.SUPABASE_URL ?? "";
  const anon = process.env.SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  console.log("=== Supabase Connection Test ===\n");
  console.log("SUPABASE_URL:", url ? "SET" : "MISSING");
  console.log("SUPABASE_ANON_KEY:", anon ? "SET" : "MISSING");
  console.log("SUPABASE_SERVICE_ROLE_KEY:", service ? "SET" : "MISSING");

  if (!url || !anon || !service) {
    console.error("\nFAIL: missing required keys");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: profiles, error: profileErr } = await admin
    .from("profiles")
    .select("id")
    .limit(1);

  if (profileErr) {
    console.error("\nFAIL: profiles table query:", profileErr.message);
    if (profileErr.message.includes("does not exist")) {
      console.error("Hint: run npm run supabase:db:push to apply migrations.");
    }
    process.exit(1);
  }

  console.log("\nOK: Service role can read profiles table");
  console.log("Sample rows accessible:", profiles?.length ?? 0, "(limit 1)");

  const anonClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: healthErr } = await anonClient.auth.getSession();
  if (healthErr) {
    console.error("WARN: anon auth client:", healthErr.message);
  } else {
    console.log("OK: Anon key accepted by Supabase Auth");
  }

  console.log("\nPASS: Supabase credentials look valid for WallPilot auth.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

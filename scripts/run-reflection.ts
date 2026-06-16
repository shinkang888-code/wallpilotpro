/**
 * Phase 4 cron helper — run: npm run reflect:decisions
 */
import { runDecisionReflection } from "../src/lib/db/reflection.server.ts";
import { isSupabaseConfigured } from "../src/lib/db/supabase.server.ts";

async function main() {
  if (!isSupabaseConfigured()) {
    console.log("SKIP: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
    process.exit(0);
  }
  const result = await runDecisionReflection(5);
  console.log(`Reflection: scanned=${result.scanned} updated=${result.updated}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

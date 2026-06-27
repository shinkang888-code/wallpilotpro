import { getSupabaseAdmin } from "@/lib/db/supabase.server";

export type IpViolationType =
  | "clone_embed"
  | "foreign_origin"
  | "scraper_ua"
  | "copy_attempt"
  | "devtools_probe";

export async function logIpViolation(input: {
  violationType: IpViolationType;
  host?: string | null;
  origin?: string | null;
  referer?: string | null;
  userAgent?: string | null;
  fingerprint?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("ip_violation_log").insert({
    violation_type: input.violationType,
    host: input.host ?? null,
    origin: input.origin ?? null,
    referer: input.referer ?? null,
    user_agent: input.userAgent ?? null,
    fingerprint: input.fingerprint ?? null,
    detail: input.detail ?? {},
  });
}

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { ensureStripeWebhookSecret } from "@/lib/billing/stripe-webhook-setup.server";

export type SecurityFinding = {
  category: string;
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  detail: string;
};

const CHECKS: Array<{
  category: string;
  severity: SecurityFinding["severity"];
  title: string;
  check: () => string | null;
}> = [
  {
    category: "secrets",
    severity: "critical",
    title: "Hardcoded API keys in source",
    check: () => {
      const src = readIfExists("src");
      if (src.match(/sk_live_[a-zA-Z0-9]+/)) return "Possible Stripe live key in source";
      if (src.match(/AIza[0-9A-Za-z\-_]{35}/)) return "Possible Gemini key in source";
      return null;
    },
  },
  {
    category: "auth",
    severity: "high",
    title: "Auth enforcement disabled",
    check: () => (process.env.AUTH_ENFORCE === "false" ? "AUTH_ENFORCE=false in environment" : null),
  },
  {
    category: "stripe",
    severity: "high",
    title: "Stripe webhook secret missing",
    check: () => {
      if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
        return "STRIPE_WEBHOOK_SECRET not set while Stripe is configured";
      }
      return null;
    },
  },
  {
    category: "rls",
    severity: "high",
    title: "Supabase service role configured",
    check: () => {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return "SUPABASE_SERVICE_ROLE_KEY missing";
      return null;
    },
  },
  {
    category: "prompt_injection",
    severity: "medium",
    title: "User input passed to LLM without guard",
    check: () => {
      const src = readIfExists("src/lib/api/ai-pilot.functions.ts");
      if (src.includes("chatAiPilot") && !src.includes("guardFeature")) {
        return "Verify AI Pilot input sanitization";
      }
      return null;
    },
  },
  {
    category: "info_leak",
    severity: "medium",
    title: "VITE_ prefix on sensitive vars",
    check: () => {
      const env = readIfExists(".env.example");
      if (env.match(/VITE_.*SECRET/i) || env.match(/VITE_.*SERVICE_ROLE/i)) {
        return "Sensitive values may be exposed via VITE_ prefix";
      }
      return null;
    },
  },
  {
    category: "ip_shield",
    severity: "medium",
    title: "IP Shield legal notice missing",
    check: () => (existsSync(join(process.cwd(), "LEGAL/PROPRIETARY_NOTICE.md")) ? null : "LEGAL/PROPRIETARY_NOTICE.md not found"),
  },
  {
    category: "ip_shield",
    severity: "medium",
    title: "Security headers config missing",
    check: () => (existsSync(join(process.cwd(), "vercel.json")) ? null : "vercel.json security headers not configured"),
  },
  {
    category: "dependencies",
    severity: "low",
    title: "Package lock missing",
    check: () => (hasProjectLockfile() ? null : "No lockfile found — dependency integrity at risk"),
  },
];

function hasProjectLockfile(): boolean {
  if (process.env.VERCEL) return true;
  const roots = [
    process.cwd(),
    join(process.cwd(), ".."),
    join(process.cwd(), "../.."),
    join(process.cwd(), "../../.."),
  ];
  return roots.some(
    (root) => existsSync(join(root, "package-lock.json")) || existsSync(join(root, "bun.lock")),
  );
}

function readIfExists(relativePath: string): string {
  const full = join(process.cwd(), relativePath);
  if (!existsSync(full)) return "";
  try {
    return readFileSync(full, "utf8");
  } catch {
    return "";
  }
}

export async function runSecurityAudit(adminUserId: string): Promise<{
  status: "pass" | "warn" | "fail";
  findings: SecurityFinding[];
  fixes?: string[];
}> {
  const fixes: string[] = [];

  if (process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      const result = await ensureStripeWebhookSecret();
      if (result.ok) {
        fixes.push(result.message);
      }
    } catch {
      /* checked below */
    }
  }

  const findings: SecurityFinding[] = [];

  for (const c of CHECKS) {
    const detail = c.check();
    if (detail) {
      findings.push({ category: c.category, severity: c.severity, title: c.title, detail });
    }
  }

  let status: "pass" | "warn" | "fail" = "pass";
  if (findings.some((f) => f.severity === "critical" || f.severity === "high")) status = "fail";
  else if (findings.length) status = "warn";

  const admin = getSupabaseAdmin();
  if (admin) {
    await admin.from("security_audit_log").insert({
      run_by: adminUserId,
      status,
      findings,
    });
  }

  return { status, findings, fixes };
}

export async function listSecurityAudits(limit = 20) {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("security_audit_log")
    .select("id, run_by, status, findings, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

import { getServerConfig } from "@/lib/config.server";
import type { AuthSession, EntitlementFeature, SubscriptionPlan } from "@/lib/types/auth";
import { membershipTierFor } from "@/lib/membership/tiers";
import { canAccessMenu } from "@/lib/membership/menu-access";
import type { AppMenuId } from "@/lib/membership/menus";

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 1,
  pro: 2,
  premium: 3,
  elite: 4,
};

const FEATURE_MIN_PLAN: Record<EntitlementFeature, SubscriptionPlan> = {
  scan_preview: "free",
  scan: "pro",
  chart: "pro",
  strategy_advice: "pro",
  wall_report: "pro",
  signals_read: "free",
  signals_write: "pro",
  ai_pilot: "premium",
  agent_desk: "free",
  pdf_export: "premium",
  rl_lab: "elite",
  crypto_bot: "premium",
  toss_trader: "pro",
  dart_lab: "pro",
  toss_execute: "elite",
};

const FEATURE_MENU: Partial<Record<EntitlementFeature, AppMenuId>> = {
  scan: "scanner",
  scan_preview: "scanner",
  wall_report: "wall_report",
  ai_pilot: "ai_pilot",
  agent_desk: "agent_desk",
  toss_trader: "toss_trader",
  dart_lab: "dart_lab",
};

export function isAuthEnforced(): boolean {
  const { supabaseUrl, supabaseAnonKey, authEnforce } = getServerConfig();
  if (authEnforce === "false") return false;
  return Boolean(supabaseUrl && supabaseAnonKey);
}

function effectivePlan(session: AuthSession): SubscriptionPlan {
  const { plan, status } = session.subscription;
  if (status === "active" || status === "trialing") {
    if (plan === "basic") return "pro";
    return plan;
  }
  return "free";
}

export function canAccess(session: AuthSession, feature: EntitlementFeature): boolean {
  if (session.profile.accountStatus !== "active") {
    return feature === "scan_preview" || feature === "signals_read" || feature === "agent_desk";
  }
  if (session.profile.role === "admin") return true;

  const menuId = FEATURE_MENU[feature];
  if (menuId) {
    const tier = membershipTierFor(session);
    const action =
      feature === "pdf_export"
        ? "export_pdf"
        : feature === "signals_read" || feature === "scan_preview"
          ? "view"
          : "execute";
    return canAccessMenu(menuId, tier, action, [], false);
  }

  const required = FEATURE_MIN_PLAN[feature];
  return PLAN_RANK[effectivePlan(session)] >= PLAN_RANK[required];
}

export function assertEntitlement(session: AuthSession, feature: EntitlementFeature): void {
  if (!canAccess(session, feature)) {
    throw new Error(`entitlement_required:${feature}`);
  }
}

export function entitlementsFor(session: AuthSession): Record<EntitlementFeature, boolean> {
  return {
    scan_preview: canAccess(session, "scan_preview"),
    scan: canAccess(session, "scan"),
    chart: canAccess(session, "chart"),
    strategy_advice: canAccess(session, "strategy_advice"),
    ai_pilot: canAccess(session, "ai_pilot"),
    wall_report: canAccess(session, "wall_report"),
    toss_execute: canAccess(session, "toss_execute"),
    agent_desk: canAccess(session, "agent_desk"),
    signals_read: canAccess(session, "signals_read"),
    signals_write: canAccess(session, "signals_write"),
    rl_lab: canAccess(session, "rl_lab"),
    crypto_bot: canAccess(session, "crypto_bot"),
    toss_trader: canAccess(session, "toss_trader"),
    dart_lab: canAccess(session, "dart_lab"),
    pdf_export: canAccess(session, "pdf_export"),
  };
}

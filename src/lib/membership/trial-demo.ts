import type { EntitlementFeature } from "@/lib/types/auth";
import type { AppMenuId, MenuAction } from "@/lib/membership/menus";
import type { MembershipTier } from "@/lib/membership/tiers";

/** 체험판 기간 — 비회원을 데모 이용자로 취급. `TRIAL_DEMO=false`로 비활성화. */
export function isTrialDemoMode(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env?.VITE_TRIAL_DEMO === "false") {
    return false;
  }
  if (typeof process !== "undefined" && process.env?.TRIAL_DEMO === "false") {
    return false;
  }
  return true;
}

/** 게스트·Free 데모용 엔타이틀먼트 (쓰기·실주문 제외). */
export function trialDemoGuestEntitlements(): Record<EntitlementFeature, boolean> {
  return {
    scan_preview: true,
    scan: true,
    chart: true,
    strategy_advice: true,
    wall_report: true,
    signals_read: true,
    signals_write: false,
    ai_pilot: true,
    agent_desk: true,
    pdf_export: true,
    rl_lab: true,
    crypto_bot: true,
    toss_trader: true,
    dart_lab: true,
    toss_execute: false,
  };
}

/** 체험판: 로그인 사용자는 티어 무관 전 기능(실주문 제외). */
export function trialDemoMemberEntitlements(): Record<EntitlementFeature, boolean> {
  return {
    scan_preview: true,
    scan: true,
    chart: true,
    strategy_advice: true,
    wall_report: true,
    signals_read: true,
    signals_write: true,
    ai_pilot: true,
    agent_desk: true,
    pdf_export: true,
    rl_lab: true,
    crypto_bot: true,
    toss_trader: true,
    dart_lab: true,
    toss_execute: false,
  };
}

const TRIAL_GUEST_API_FEATURES = new Set<EntitlementFeature>([
  "scan_preview",
  "scan",
  "chart",
  "strategy_advice",
  "wall_report",
  "signals_read",
  "ai_pilot",
  "agent_desk",
  "dart_lab",
  "rl_lab",
  "toss_trader",
  "crypto_bot",
  "pdf_export",
]);

export function trialDemoAllowsApiFeature(feature: EntitlementFeature): boolean {
  return TRIAL_GUEST_API_FEATURES.has(feature);
}

export function trialDemoAllowsMenu(
  menuId: AppMenuId,
  _tier: MembershipTier,
  action: MenuAction,
): boolean {
  if (action === "view") return true;
  if (action === "export_pdf") return true;
  return true;
}

export function trialDemoSkipsAuthNotice(feature?: EntitlementFeature): boolean {
  if (!isTrialDemoMode()) return false;
  if (!feature) return true;
  return feature !== "toss_execute";
}

/** 클라이언트: 체험판이면 게스트도 기능 사용 가능 여부 판단. */
export function clientHasEntitlement(
  enforced: boolean,
  entitlements: Record<EntitlementFeature, boolean> | null,
  feature: EntitlementFeature,
): boolean {
  if (!enforced) return true;
  if (isTrialDemoMode()) return trialDemoGuestEntitlements()[feature];
  return Boolean(entitlements?.[feature]);
}

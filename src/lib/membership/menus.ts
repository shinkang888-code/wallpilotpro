import type { MembershipTier } from "@/lib/membership/tiers";

/** Unique menu identifiers — used in DB, activity logs, and admin permissions. */
export type AppMenuId =
  | "scanner"
  | "wall_report"
  | "ai_pilot"
  | "agent_desk"
  | "toss_trader"
  | "dart_lab"
  | "my_api"
  | "pricing"
  /** @deprecated Nav removed — routes/entitlements only */
  | "signal_hub"
  | "rl_lab"
  | "crypto_bot";

export type MenuAction = "view" | "execute" | "export_pdf";

export type AppMenuDefinition = {
  id: AppMenuId;
  path: string;
  labelKey: string;
  /** Source repo namespace — empty = WallPilot core. */
  namespace: "" | "ta" | "ait" | "tm" | "dart" | "ft";
  /** Default minimum tier when DB override absent. */
  defaultMinTier: MembershipTier;
  /** Extension module phase (for placeholder UI). */
  phase: 1 | 2 | 3 | 4 | 5 | 6;
};

/** Top navigation menus in display order. Admin routes are separate (role-gated). */
export const APP_MENUS: AppMenuDefinition[] = [
  {
    id: "scanner",
    path: "/",
    labelKey: "nav_scanner",
    namespace: "",
    defaultMinTier: "free",
    phase: 1,
  },
  {
    id: "wall_report",
    path: "/wall-street-report",
    labelKey: "nav_wall_street_report",
    namespace: "",
    defaultMinTier: "day_trading",
    phase: 1,
  },
  {
    id: "dart_lab",
    path: "/dartlab",
    labelKey: "nav_dart_lab",
    namespace: "dart",
    defaultMinTier: "day_trading",
    phase: 5,
  },
  {
    id: "ai_pilot",
    path: "/ai-pilot",
    labelKey: "nav_ai_pilot",
    namespace: "",
    defaultMinTier: "premium",
    phase: 1,
  },
  {
    id: "agent_desk",
    path: "/agents/desk",
    labelKey: "nav_agent_desk",
    namespace: "ta",
    defaultMinTier: "premium",
    phase: 2,
  },
  {
    id: "toss_trader",
    path: "/toss-trader",
    labelKey: "nav_toss_trader",
    namespace: "",
    defaultMinTier: "day_trading",
    phase: 1,
  },
  {
    id: "my_api",
    path: "/my-api",
    labelKey: "nav_my_api",
    namespace: "",
    defaultMinTier: "free",
    phase: 1,
  },
  {
    id: "pricing",
    path: "/pricing",
    labelKey: "nav_pricing",
    namespace: "",
    defaultMinTier: "free",
    phase: 1,
  },
];

export function menuByPath(pathname: string): AppMenuDefinition | undefined {
  if (pathname === "/") return APP_MENUS.find((m) => m.id === "scanner");
  return APP_MENUS.find((m) => m.path !== "/" && pathname.startsWith(m.path));
}

export function menuById(id: AppMenuId): AppMenuDefinition | undefined {
  return APP_MENUS.find((m) => m.id === id);
}

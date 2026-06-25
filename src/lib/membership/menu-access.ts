import type { MembershipTier } from "@/lib/membership/tiers";
import { APP_MENUS, type AppMenuId, type MenuAction } from "@/lib/membership/menus";

export type MenuTierPermission = {
  menuId: AppMenuId;
  tier: MembershipTier;
  canView: boolean;
  canExecute: boolean;
  canExportPdf: boolean;
};

const TIER_RANK: Record<MembershipTier, number> = {
  free: 0,
  day_trading: 1,
  premium: 2,
  elite: 3,
};

/** Built-in defaults — mirrored in DB seed migration. */
const DEFAULT_MATRIX: MenuTierPermission[] = [
  { menuId: "scanner", tier: "free", canView: true, canExecute: false, canExportPdf: false },
  { menuId: "scanner", tier: "day_trading", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "scanner", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "scanner", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "wall_report", tier: "day_trading", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "wall_report", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "wall_report", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "dart_lab", tier: "free", canView: true, canExecute: false, canExportPdf: false },
  { menuId: "dart_lab", tier: "day_trading", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "dart_lab", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "dart_lab", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "ai_pilot", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "ai_pilot", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "agent_desk", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "agent_desk", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "signal_hub", tier: "free", canView: true, canExecute: false, canExportPdf: false },
  { menuId: "signal_hub", tier: "day_trading", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "signal_hub", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "signal_hub", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "rl_lab", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "crypto_bot", tier: "free", canView: true, canExecute: false, canExportPdf: false },
  { menuId: "crypto_bot", tier: "day_trading", canView: true, canExecute: false, canExportPdf: false },
  { menuId: "crypto_bot", tier: "premium", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "crypto_bot", tier: "elite", canView: true, canExecute: true, canExportPdf: true },
  { menuId: "my_api", tier: "free", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "my_api", tier: "day_trading", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "my_api", tier: "premium", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "my_api", tier: "elite", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "pricing", tier: "free", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "pricing", tier: "day_trading", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "pricing", tier: "premium", canView: true, canExecute: true, canExportPdf: false },
  { menuId: "pricing", tier: "elite", canView: true, canExecute: true, canExportPdf: false },
];

function defaultPermission(menuId: AppMenuId, tier: MembershipTier): MenuTierPermission | null {
  return DEFAULT_MATRIX.find((r) => r.menuId === menuId && r.tier === tier) ?? null;
}

function resolvePermission(
  menuId: AppMenuId,
  tier: MembershipTier,
  overrides: MenuTierPermission[],
): MenuTierPermission {
  const override = overrides.find((r) => r.menuId === menuId && r.tier === tier);
  if (override) return override;
  const builtIn = defaultPermission(menuId, tier);
  if (builtIn) return builtIn;
  const menu = APP_MENUS.find((m) => m.id === menuId);
  const minRank = TIER_RANK[menu?.defaultMinTier ?? "free"];
  const tierRank = TIER_RANK[tier];
  return {
    menuId,
    tier,
    canView: tierRank >= minRank,
    canExecute: tierRank >= minRank,
    canExportPdf: tierRank >= TIER_RANK.premium,
  };
}

export function canAccessMenu(
  menuId: AppMenuId,
  tier: MembershipTier,
  action: MenuAction,
  overrides: MenuTierPermission[] = [],
  isAdmin = false,
): boolean {
  if (isAdmin) return true;
  const perm = resolvePermission(menuId, tier, overrides);
  if (action === "view") return perm.canView;
  if (action === "execute") return perm.canExecute;
  return perm.canExportPdf;
}

export function visibleMenusForTier(
  tier: MembershipTier,
  overrides: MenuTierPermission[] = [],
  isAdmin = false,
): AppMenuId[] {
  return APP_MENUS.filter((m) => canAccessMenu(m.id, tier, "view", overrides, isAdmin)).map((m) => m.id);
}

export function buildDefaultPermissionMatrix(): MenuTierPermission[] {
  const tiers: MembershipTier[] = ["free", "day_trading", "premium", "elite"];
  const rows: MenuTierPermission[] = [];
  for (const menu of APP_MENUS) {
    for (const tier of tiers) {
      rows.push(resolvePermission(menu.id, tier, []));
    }
  }
  return rows;
}

export { DEFAULT_MATRIX, TIER_RANK };

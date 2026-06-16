import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { APP_MENUS } from "@/lib/membership/menus";
import {
  buildDefaultPermissionMatrix,
  type MenuTierPermission,
} from "@/lib/membership/menu-access";
import type { MembershipTier } from "@/lib/membership/tiers";

function rowToPermission(row: {
  menu_id: string;
  tier: string;
  can_view: boolean;
  can_execute: boolean;
  can_export_pdf: boolean;
}): MenuTierPermission {
  return {
    menuId: row.menu_id as MenuTierPermission["menuId"],
    tier: row.tier as MembershipTier,
    canView: row.can_view,
    canExecute: row.can_execute,
    canExportPdf: row.can_export_pdf,
  };
}

export async function loadMenuPermissions(): Promise<MenuTierPermission[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return buildDefaultPermissionMatrix();

  const { data, error } = await admin.from("menu_tier_permissions").select("*");
  if (error || !data?.length) return buildDefaultPermissionMatrix();
  return data.map(rowToPermission);
}

export async function saveMenuPermissions(
  adminUserId: string,
  permissions: MenuTierPermission[],
): Promise<{ ok: boolean }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false };

  const rows = permissions.map((p) => ({
    menu_id: p.menuId,
    tier: p.tier,
    can_view: p.canView,
    can_execute: p.canExecute,
    can_export_pdf: p.canExportPdf,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("menu_tier_permissions").upsert(rows, {
    onConflict: "menu_id,tier",
  });

  if (error) return { ok: false };

  await admin.from("admin_audit_log").insert({
    admin_id: adminUserId,
    action: "menu_permissions_updated",
    payload: { count: rows.length },
  });

  return { ok: true };
}

export function menuPermissionSummary(): { menuId: string; labelKey: string }[] {
  return APP_MENUS.map((m) => ({ menuId: m.id, labelKey: m.labelKey }));
}

import { Fragment, useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { adminGetMenuPermissions, adminSaveMenuPermissions } from "@/lib/api/menu-permissions.functions";
import { useI18n } from "@/lib/i18n";
import { APP_MENUS } from "@/lib/membership/menus";
import type { MenuTierPermission } from "@/lib/membership/menu-access";
import type { MembershipTier } from "@/lib/membership/tiers";

const TIERS: MembershipTier[] = ["free", "day_trading", "premium", "elite"];

export function AdminPermissionsTable({
  accessToken,
}: {
  accessToken: string;
}) {
  const { t } = useI18n();
  const [rows, setRows] = useState<MenuTierPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetMenuPermissions({ data: { accessToken } });
      setRows(data.permissions);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateCell = (
    menuId: MenuTierPermission["menuId"],
    tier: MembershipTier,
    field: "canView" | "canExecute" | "canExportPdf",
    value: boolean,
  ) => {
    setRows((prev) => {
      const idx = prev.findIndex((r) => r.menuId === menuId && r.tier === tier);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], [field]: value };
        return next;
      }
      return [...prev, { menuId, tier, canView: false, canExecute: false, canExportPdf: false, [field]: value }];
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await adminSaveMenuPermissions({ data: { accessToken, permissions: rows } });
      if (res.ok) toast.success(t("admin_permissions_saved"));
      else toast.error(t("admin_action_fail"));
    } catch {
      toast.error(t("admin_action_fail"));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="rounded-xl bg-foreground px-4 py-2 text-xs font-semibold text-background"
        >
          {saving ? t("admin_saving") : t("admin_permissions_save")}
        </button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-hairline bg-white">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-hairline bg-surface/80 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5">{t("admin_perm_menu")}</th>
              {TIERS.map((tier) => (
                <th key={tier} className="px-3 py-2.5 text-center" colSpan={3}>
                  {tier}
                </th>
              ))}
            </tr>
            <tr className="border-b border-hairline bg-surface/50 text-[9px] text-muted-foreground">
              <th />
              {TIERS.flatMap((tier) => [
                <th key={`${tier}-v`} className="px-1 py-1 text-center">
                  {t("admin_perm_view")}
                </th>,
                <th key={`${tier}-e`} className="px-1 py-1 text-center">
                  {t("admin_perm_exec")}
                </th>,
                <th key={`${tier}-p`} className="px-1 py-1 text-center">
                  PDF
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {APP_MENUS.map((menu) => (
              <tr key={menu.id} className="border-b border-hairline last:border-0">
                <td className="px-3 py-2 font-medium">{t(menu.labelKey)}</td>
                {TIERS.map((tier) => {
                  const row = rows.find((r) => r.menuId === menu.id && r.tier === tier) ?? {
                    menuId: menu.id,
                    tier,
                    canView: false,
                    canExecute: false,
                    canExportPdf: false,
                  };
                  return (
                    <Fragment key={`${menu.id}-${tier}`}>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.canView}
                          onChange={(e) => updateCell(menu.id, tier, "canView", e.target.checked)}
                        />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.canExecute}
                          onChange={(e) => updateCell(menu.id, tier, "canExecute", e.target.checked)}
                        />
                      </td>
                      <td className="px-1 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={row.canExportPdf}
                          onChange={(e) => updateCell(menu.id, tier, "canExportPdf", e.target.checked)}
                        />
                      </td>
                    </Fragment>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { adminListActivity } from "@/lib/api/activity.functions";
import { useI18n } from "@/lib/i18n";
import type { UserActivityRow } from "@/lib/types/auth";

export function AdminActivityTable({ accessToken }: { accessToken: string }) {
  const { t } = useI18n();
  const [rows, setRows] = useState<UserActivityRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = (await adminListActivity({ data: { accessToken, limit: 150 } })) as UserActivityRow[];
      setRows(data);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-white">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-hairline bg-surface/80 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">{t("admin_activity_time")}</th>
            <th className="px-3 py-2.5">{t("admin_col_email")}</th>
            <th className="px-3 py-2.5">{t("admin_activity_event")}</th>
            <th className="px-3 py-2.5">{t("admin_perm_menu")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-hairline last:border-0">
              <td className="px-3 py-2 tabular-nums text-muted-foreground">
                {new Date(r.createdAt).toLocaleString()}
              </td>
              <td className="px-3 py-2">{r.userEmail ?? r.userId ?? "—"}</td>
              <td className="px-3 py-2 font-medium">{r.eventType}</td>
              <td className="px-3 py-2">{r.menuId ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t("admin_empty")}</p>
      )}
    </div>
  );
}

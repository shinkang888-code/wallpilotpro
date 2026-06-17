import type { AdminStats } from "@/lib/admin/users.server";
import { useI18n } from "@/lib/i18n";

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const { t } = useI18n();
  const items = [
    { key: "pending", label: t("admin_stat_pending"), value: stats.pending },
    { key: "active", label: t("admin_stat_active"), value: stats.active },
    { key: "suspended", label: t("admin_stat_suspended"), value: stats.suspended },
    { key: "admins", label: t("admin_stat_admins"), value: stats.admins },
    { key: "subAdmins", label: t("admin_stat_sub_admins"), value: stats.subAdmins },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.key}
          className="rounded-xl border border-hairline bg-white px-4 py-3"
        >
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="mt-1 font-display text-2xl font-bold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

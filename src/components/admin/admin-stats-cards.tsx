import type { AdminStats } from "@/lib/admin/users.server";
import { useI18n } from "@/lib/i18n";

export function AdminStatsCards({ stats }: { stats: AdminStats }) {
  const { t } = useI18n();
  const items = [
    { key: "pending", label: t("admin_stat_pending"), value: stats.pending, tone: "amber" },
    { key: "active", label: t("admin_stat_active"), value: stats.active, tone: "green" },
    { key: "suspended", label: t("admin_stat_suspended"), value: stats.suspended, tone: "red" },
    { key: "admins", label: t("admin_stat_admins"), value: stats.admins, tone: "primary" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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

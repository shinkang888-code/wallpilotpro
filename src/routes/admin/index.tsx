import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Shield } from "lucide-react";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminStatsCards } from "@/components/admin/admin-stats-cards";
import { AdminUserTable } from "@/components/admin/admin-user-table";
import { Header } from "@/components/header";
import { adminGetStats, adminListUsers } from "@/lib/api/admin.functions";
import { useI18n } from "@/lib/i18n";
import type { AdminUserRow, UserRole } from "@/lib/types/auth";
import type { AdminStats } from "@/lib/admin/users.server";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

function AdminPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [filter, setFilter] = useState<"pending" | "active" | "suspended" | "all">("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!auth.accessToken || !auth.isStaff) return;
    setLoading(true);
    setError(null);
    try {
      const [rows, s] = await Promise.all([
        adminListUsers({
          data: {
            accessToken: auth.accessToken,
            statusFilter: filter === "all" ? undefined : filter,
          },
        }),
        adminGetStats({ data: { accessToken: auth.accessToken } }),
      ]);
      setUsers(rows);
      setStats(s);
    } catch (e) {
      setError(e instanceof Error ? e.message : "admin_load_failed");
    } finally {
      setLoading(false);
    }
  }, [auth.accessToken, auth.isStaff, filter]);

  useEffect(() => {
    if (auth.isStaff && auth.accessToken) void load();
  }, [auth.isStaff, auth.accessToken, load]);

  const showPanel = auth.isStaff && auth.accessToken;

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {t("admin_title")}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{t("admin_subtitle")}</p>
            </div>
          </div>
          {showPanel && (
            <Link
              to="/pricing"
              className="rounded-xl border border-hairline bg-white px-4 py-2 text-xs font-semibold hover:bg-surface"
            >
              {t("nav_pricing")}
            </Link>
          )}
        </div>

        <AdminGate />

        {showPanel && (
          <>
            <AdminNav />
            {stats && (
              <div className="mb-6">
                <AdminStatsCards stats={stats} />
              </div>
            )}

            <div className="mb-4 flex flex-wrap gap-2">
              {(["pending", "active", "suspended", "all"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    filter === f ? "bg-foreground text-background" : "bg-surface text-muted-foreground"
                  }`}
                >
                  {f === "all" ? t("admin_filter_all") : f}
                  {stats && f !== "all" && (
                    <span className="ml-1 opacity-70">
                      ({f === "pending" ? stats.pending : f === "active" ? stats.active : stats.suspended})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
            {!loading && (
              <AdminUserTable
                users={users}
                accessToken={auth.accessToken!}
                currentUserId={auth.user!.id}
                actorRole={(auth.profile?.role ?? "user") as UserRole}
                onChanged={load}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

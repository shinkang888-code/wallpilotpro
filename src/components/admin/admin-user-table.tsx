import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  adminApproveUser,
  adminDeleteUser,
  adminSetUserPlan,
  adminSetUserRole,
  adminSuspendUser,
} from "@/lib/api/admin.functions";
import { useI18n } from "@/lib/i18n";
import type { AdminUserRow, SubscriptionPlan, UserRole } from "@/lib/types/auth";
import { cn } from "@/lib/utils";

export function AdminUserTable({
  users,
  accessToken,
  currentUserId,
  onChanged,
}: {
  users: AdminUserRow[];
  accessToken: string;
  currentUserId: string;
  onChanged: () => void;
}) {
  const { t } = useI18n();
  const [busyId, setBusyId] = useState<string | null>(null);

  const run = async (userId: string, fn: () => Promise<{ ok: boolean; message: string }>) => {
    setBusyId(userId);
    try {
      const res = await fn();
      if (res.ok) {
        toast.success(t("admin_action_ok"));
        onChanged();
      } else {
        const msg =
          res.message === "last_admin"
            ? t("admin_err_last_admin")
            : res.message === "cannot_demote_self"
              ? t("admin_err_demote_self")
              : res.message;
        toast.error(msg);
      }
    } catch {
      toast.error(t("admin_action_fail"));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-hairline bg-white">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead>
          <tr className="border-b border-hairline bg-surface/80 text-[10px] uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2.5">{t("admin_col_email")}</th>
            <th className="px-3 py-2.5">{t("admin_col_status")}</th>
            <th className="px-3 py-2.5">{t("admin_col_plan")}</th>
            <th className="px-3 py-2.5">{t("admin_col_role")}</th>
            <th className="px-3 py-2.5">{t("admin_col_actions")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-hairline last:border-0">
              <td className="px-3 py-3">
                <div className="font-medium text-foreground">{u.email}</div>
                <div className="text-[10px] text-muted-foreground">{u.displayName ?? "—"}</div>
              </td>
              <td className="px-3 py-3">
                <StatusBadge status={u.accountStatus} />
              </td>
              <td className="px-3 py-3">
                <select
                  className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs"
                  value={u.subscription.plan}
                  disabled={busyId === u.id}
                  onChange={(e) =>
                    void run(u.id, () =>
                      adminSetUserPlan({
                        data: {
                          accessToken,
                          userId: u.id,
                          plan: e.target.value as SubscriptionPlan,
                        },
                      }),
                    )
                  }
                >
                  {(["free", "pro", "premium", "elite"] as const).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-3">
                <select
                  className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs capitalize"
                  value={u.role}
                  disabled={busyId === u.id}
                  onChange={(e) =>
                    void run(u.id, () =>
                      adminSetUserRole({
                        data: {
                          accessToken,
                          userId: u.id,
                          role: e.target.value as UserRole,
                        },
                      }),
                    )
                  }
                >
                  <option value="user">{t("admin_role_user")}</option>
                  <option value="admin">{t("admin_role_admin")}</option>
                </select>
                {u.id === currentUserId && (
                  <span className="mt-1 block text-[9px] text-muted-foreground">{t("admin_you")}</span>
                )}
              </td>
              <td className="px-3 py-3">
                <div className="flex flex-wrap gap-1">
                  {u.accountStatus === "pending" && (
                    <ActionBtn
                      label={t("admin_approve")}
                      variant="positive"
                      loading={busyId === u.id}
                      onClick={() =>
                        run(u.id, () =>
                          adminApproveUser({ data: { accessToken, userId: u.id } }),
                        )
                      }
                    />
                  )}
                  {u.accountStatus === "active" && (
                    <ActionBtn
                      label={t("admin_suspend")}
                      loading={busyId === u.id}
                      onClick={() =>
                        run(u.id, () =>
                          adminSuspendUser({ data: { accessToken, userId: u.id } }),
                        )
                      }
                    />
                  )}
                  {u.accountStatus === "suspended" && (
                    <ActionBtn
                      label={t("admin_approve")}
                      variant="positive"
                      loading={busyId === u.id}
                      onClick={() =>
                        run(u.id, () =>
                          adminApproveUser({ data: { accessToken, userId: u.id } }),
                        )
                      }
                    />
                  )}
                  <ActionBtn
                    label={t("admin_delete")}
                    variant="danger"
                    loading={busyId === u.id}
                    onClick={() =>
                      run(u.id, () =>
                        adminDeleteUser({ data: { accessToken, userId: u.id } }),
                      )
                    }
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 && (
        <p className="px-4 py-8 text-center text-xs text-muted-foreground">{t("admin_empty")}</p>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
        status === "active" && "bg-emerald-50 text-positive",
        status === "pending" && "bg-amber-50 text-amber-800",
        status === "suspended" && "bg-red-50 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

function ActionBtn({
  label,
  onClick,
  loading,
  variant,
}: {
  label: string;
  onClick: () => void;
  loading?: boolean;
  variant?: "positive" | "danger";
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold",
        variant === "positive" && "border-positive/30 text-positive hover:bg-emerald-50",
        variant === "danger" && "border-destructive/30 text-destructive hover:bg-red-50",
        !variant && "border-hairline hover:bg-surface",
      )}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin" />}
      {label}
    </button>
  );
}

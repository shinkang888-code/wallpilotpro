import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import type { AccountStatus, AdminUserRow, SubscriptionPlan, UserRole } from "@/lib/types/auth";

async function logAdminAction(
  admin: SupabaseClient,
  adminId: string,
  targetUserId: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  await admin.from("admin_audit_log").insert({
    admin_id: adminId,
    target_user_id: targetUserId,
    action,
    payload,
  });
}

export async function listAdminUsers(statusFilter?: AccountStatus): Promise<AdminUserRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  let query = admin
    .from("profiles")
    .select("id, email, display_name, avatar_url, account_status, role, created_at, approved_at")
    .neq("account_status", "deleted")
    .order("created_at", { ascending: false })
    .limit(200);

  if (statusFilter) {
    query = query.eq("account_status", statusFilter);
  }

  const { data: profiles, error } = await query;
  if (error || !profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: subs } = await admin
    .from("subscriptions")
    .select("user_id, plan, status, current_period_end")
    .in("user_id", ids);

  const subMap = new Map((subs ?? []).map((s) => [s.user_id, s]));

  return profiles.map((row) => {
    const sub = subMap.get(row.id);
    return {
      id: row.id,
      email: row.email,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      accountStatus: row.account_status,
      role: row.role,
      createdAt: row.created_at,
      approvedAt: row.approved_at,
      subscription: {
        plan: sub?.plan ?? "free",
        status: sub?.status ?? "inactive",
        currentPeriodEnd: sub?.current_period_end ?? null,
      },
    };
  });
}

export async function setUserAccountStatus(
  adminUserId: string,
  targetUserId: string,
  status: AccountStatus,
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "supabase_not_configured" };

  const patch: Record<string, unknown> = {
    account_status: status,
    updated_at: new Date().toISOString(),
  };
  if (status === "active") {
    patch.approved_at = new Date().toISOString();
    patch.approved_by = adminUserId;
  }
  if (status === "deleted") {
    patch.deleted_at = new Date().toISOString();
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", targetUserId);
  if (error) return { ok: false, message: error.message };

  if (status === "active") {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("plan, status")
      .eq("user_id", targetUserId)
      .maybeSingle();
    const needsPlan =
      !sub || sub.plan === "free" || sub.status === "inactive" || sub.status === "canceled";
    if (needsPlan) {
      await admin.from("subscriptions").upsert({
        user_id: targetUserId,
        plan: "pro",
        status: "active",
        updated_at: new Date().toISOString(),
      });
    }
  }

  if (status === "deleted") {
    await admin.auth.admin.deleteUser(targetUserId);
  }

  await logAdminAction(admin, adminUserId, targetUserId, `status:${status}`);
  return { ok: true, message: "updated" };
}

export async function setUserPlanOverride(
  adminUserId: string,
  targetUserId: string,
  plan: SubscriptionPlan,
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "supabase_not_configured" };

  const { error } = await admin.from("subscriptions").upsert({
    user_id: targetUserId,
    plan,
    status: plan === "free" ? "inactive" : "active",
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: error.message };

  await logAdminAction(admin, adminUserId, targetUserId, "plan_override", { plan });
  return { ok: true, message: "updated" };
}

export type AdminStats = {
  pending: number;
  active: number;
  suspended: number;
  admins: number;
};

export async function getAdminStats(): Promise<AdminStats> {
  const admin = getSupabaseAdmin();
  if (!admin) return { pending: 0, active: 0, suspended: 0, admins: 0 };

  const count = async (filter: Record<string, string>) => {
    const { count: n } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .match(filter)
      .neq("account_status", "deleted");
    return n ?? 0;
  };

  const [pending, active, suspended, admins] = await Promise.all([
    count({ account_status: "pending" }),
    count({ account_status: "active" }),
    count({ account_status: "suspended" }),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("account_status", "deleted")
      .then((r) => r.count ?? 0),
  ]);

  return { pending, active, suspended, admins };
}

export async function setUserRole(
  adminUserId: string,
  targetUserId: string,
  role: UserRole,
): Promise<{ ok: boolean; message: string }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false, message: "supabase_not_configured" };

  if (adminUserId === targetUserId && role !== "admin") {
    return { ok: false, message: "cannot_demote_self" };
  }

  if (role !== "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .neq("account_status", "deleted");
    const { data: target } = await admin
      .from("profiles")
      .select("role")
      .eq("id", targetUserId)
      .maybeSingle();
    if ((count ?? 0) <= 1 && target?.role === "admin") {
      return { ok: false, message: "last_admin" };
    }
  }

  const { error } = await admin
    .from("profiles")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", targetUserId);
  if (error) return { ok: false, message: error.message };

  await logAdminAction(admin, adminUserId, targetUserId, "role_change", { role });
  return { ok: true, message: "updated" };
}

import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveStaffRoleForEmail } from "@/lib/auth/staff-roles.server";
import type {
  AccountStatus,
  SubscriptionPlan,
  SubscriptionStatus,
  UserProfile,
  UserRole,
  UserSubscription,
} from "@/lib/types/auth";

type ProfileRow = {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  account_status: AccountStatus;
  role: UserRole;
  created_at: string;
  approved_at: string | null;
};

type SubRow = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_end: string | null;
};

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    accountStatus: row.account_status,
    role: row.role,
    createdAt: row.created_at,
    approvedAt: row.approved_at,
  };
}

function mapSub(row: SubRow | null): UserSubscription {
  return {
    plan: row?.plan ?? "free",
    status: row?.status ?? "inactive",
    currentPeriodEnd: row?.current_period_end ?? null,
  };
}

export async function ensureProfileForUser(
  admin: SupabaseClient,
  userId: string,
  email: string,
  meta?: { name?: string; avatar?: string },
): Promise<void> {
  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return;

  const staffRole = resolveStaffRoleForEmail(email);
  const isAdmin = staffRole === "admin";

  await admin.from("profiles").insert({
    id: userId,
    email,
    display_name: meta?.name ?? null,
    avatar_url: meta?.avatar ?? null,
    account_status: "active",
    role: staffRole ?? "user",
    approved_at: new Date().toISOString(),
  });
  await admin.from("subscriptions").insert({
    user_id: userId,
    plan: isAdmin ? "elite" : "free",
    status: isAdmin ? "active" : "inactive",
  });
}

/** Legacy pending users: activate on login without changing subscription tier. */
export async function activatePendingUserOnLogin(admin: SupabaseClient, userId: string, email: string): Promise<void> {
  const now = new Date().toISOString();
  const staffRole = resolveStaffRoleForEmail(email);

  if (staffRole) {
    await admin
      .from("profiles")
      .update({ role: staffRole, account_status: "active", approved_at: now, updated_at: now })
      .eq("id", userId);
    if (staffRole === "admin") {
      await admin
        .from("subscriptions")
        .update({ plan: "elite", status: "active", updated_at: now })
        .eq("user_id", userId);
    }
  }

  await admin
    .from("profiles")
    .update({ account_status: "active", approved_at: now, updated_at: now })
    .eq("id", userId)
    .eq("account_status", "pending");
}

export async function fetchProfileBundle(
  admin: SupabaseClient,
  userId: string,
): Promise<{ profile: UserProfile; subscription: UserSubscription } | null> {
  const { data: profile, error } = await admin
    .from("profiles")
    .select("id, email, display_name, avatar_url, account_status, role, created_at, approved_at")
    .eq("id", userId)
    .maybeSingle();

  if (error || !profile) return null;

  const { data: sub } = await admin
    .from("subscriptions")
    .select("plan, status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();

  return {
    profile: mapProfile(profile as ProfileRow),
    subscription: mapSub((sub as SubRow | null) ?? null),
  };
}

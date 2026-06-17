import type { SupabaseClient } from "@supabase/supabase-js";

import { getServerConfig } from "@/lib/config.server";
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

  const { bootstrapAdminEmail } = getServerConfig();
  const isBootstrap = Boolean(bootstrapAdminEmail && email === bootstrapAdminEmail);

  await admin.from("profiles").insert({
    id: userId,
    email,
    display_name: meta?.name ?? null,
    avatar_url: meta?.avatar ?? null,
    account_status: isBootstrap ? "active" : "pending",
    role: isBootstrap ? "admin" : "user",
    approved_at: isBootstrap ? new Date().toISOString() : null,
  });
  await admin.from("subscriptions").insert({
    user_id: userId,
    plan: isBootstrap ? "elite" : "free",
    status: isBootstrap ? "active" : "inactive",
  });
}

/** Beta onboarding: activate pending users and grant Pro when AUTH_AUTO_APPROVE is enabled. */
export async function autoApprovePendingUser(admin: SupabaseClient, userId: string): Promise<void> {
  const { authAutoApprove } = getServerConfig();
  if (authAutoApprove === "false") return;

  const now = new Date().toISOString();
  await admin
    .from("profiles")
    .update({ account_status: "active", approved_at: now, updated_at: now })
    .eq("id", userId)
    .in("account_status", ["pending"]);

  // Beta: ensure every signed-in user has active Pro entitlements.
  await admin
    .from("subscriptions")
    .update({ plan: "pro", status: "active", updated_at: now })
    .eq("user_id", userId);
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

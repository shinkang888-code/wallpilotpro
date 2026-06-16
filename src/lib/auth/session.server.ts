import { createClient } from "@supabase/supabase-js";

import {
  autoApprovePendingUser,
  fetchProfileBundle,
  ensureProfileForUser,
} from "@/lib/auth/profiles.server";
import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import type { AuthSession } from "@/lib/types/auth";
import { isAuthEnforced } from "@/lib/auth/entitlements.server";

export function isSupabaseAuthConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getServerConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export type AuthSessionError =
  | "missing_service_role"
  | "missing_anon_key"
  | "invalid_token"
  | "profile_missing";

export function explainAuthSessionFailure(
  accessToken: string | null | undefined,
): AuthSessionError | null {
  if (!accessToken?.trim()) return null;
  const { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey } = getServerConfig();
  if (!supabaseUrl) return "missing_anon_key";
  if (!supabaseAnonKey) return "missing_anon_key";
  if (!supabaseServiceRoleKey) return "missing_service_role";
  return "profile_missing";
}

export async function resolveAuthSession(accessToken: string | null | undefined): Promise<AuthSession | null> {
  if (!accessToken?.trim()) return null;

  const { supabaseUrl, supabaseAnonKey } = getServerConfig();
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error } = await authClient.auth.getUser(accessToken);
  if (error || !userData.user?.id || !userData.user.email) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  await ensureProfileForUser(admin, userData.user.id, userData.user.email, {
    name: userData.user.user_metadata?.full_name ?? userData.user.user_metadata?.name,
    avatar: userData.user.user_metadata?.avatar_url,
  });

  await autoApprovePendingUser(admin, userData.user.id);

  const bundle = await fetchProfileBundle(admin, userData.user.id);
  if (!bundle) return null;

  return {
    user: { id: userData.user.id, email: userData.user.email },
    profile: bundle.profile,
    subscription: bundle.subscription,
    accessToken,
  };
}

export async function requireAuthSession(accessToken: string | null | undefined): Promise<AuthSession> {
  if (!isAuthEnforced()) {
    throw new Error("auth_not_configured");
  }
  if (!isSupabaseConfigured()) {
    throw new Error("auth_not_configured");
  }
  const session = await resolveAuthSession(accessToken);
  if (!session) throw new Error("unauthorized");
  if (session.profile.accountStatus === "deleted") throw new Error("account_deleted");
  if (session.profile.accountStatus === "suspended") throw new Error("account_suspended");
  return session;
}

export async function requireActiveSession(accessToken: string | null | undefined): Promise<AuthSession> {
  const session = await requireAuthSession(accessToken);
  if (session.profile.accountStatus === "pending") throw new Error("account_pending");
  if (session.profile.accountStatus !== "active") throw new Error("account_blocked");
  return session;
}

export async function requireAdminSession(accessToken: string | null | undefined): Promise<AuthSession> {
  const session = await requireAuthSession(accessToken);
  if (session.profile.role !== "admin") throw new Error("forbidden");
  return session;
}

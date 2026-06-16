import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getAuthMe } from "@/lib/api/auth.functions";
import { ensureClientSupabaseConfig } from "@/lib/auth/load-supabase-config";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";
import type { EntitlementFeature, SubscriptionPlan } from "@/lib/types/auth";
import {
  membershipTierFromPlan,
  type MembershipTier,
} from "@/lib/membership/tiers";

type AuthState = {
  loading: boolean;
  enforced: boolean;
  clientConfigured: boolean;
  accessToken: string | null;
  user: { id: string; email: string } | null;
  profile: {
    accountStatus: string;
    role: string;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  subscription: { plan: string; status: string } | null;
  entitlements: Record<EntitlementFeature, boolean> | null;
  membershipTier: MembershipTier;
  isAdmin: boolean;
  isPending: boolean;
  isActive: boolean;
  refresh: () => Promise<void>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [enforced, setEnforced] = useState(false);
  const [clientConfigured, setClientConfigured] = useState(false);
  const [user, setUser] = useState<AuthState["user"]>(null);
  const [profile, setProfile] = useState<AuthState["profile"]>(null);
  const [subscription, setSubscription] = useState<AuthState["subscription"]>(null);
  const [entitlements, setEntitlements] = useState<AuthState["entitlements"]>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    const configured = await ensureClientSupabaseConfig();
    setClientConfigured(configured);

    const supabase = configured ? getSupabaseBrowser() : null;
    let token: string | null = null;
    if (supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token ?? null;
    }
    setAccessToken(token);

    try {
      const me = await getAuthMe({ data: { accessToken: token } });
      setEnforced(me.enforced);
      if (me.session) {
        setUser(me.session.user);
        setProfile({
          accountStatus: me.session.profile.accountStatus,
          role: me.session.profile.role,
          displayName: me.session.profile.displayName,
          avatarUrl: me.session.profile.avatarUrl,
        });
        setSubscription(me.session.subscription);
        setEntitlements(me.entitlements);
      } else {
        setUser(null);
        setProfile(null);
        setSubscription(null);
        setEntitlements(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!clientConfigured) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      void refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [clientConfigured, refresh]);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    const configured = await ensureClientSupabaseConfig();
    if (!configured) return "supabase_not_configured";

    const supabase = getSupabaseBrowser();
    if (!supabase) return "supabase_not_configured";

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) return error.message;
    return null;
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    await refresh();
  }, [refresh]);

  const membershipTier = useMemo<MembershipTier>(() => {
    if (!user || !profile || profile.accountStatus !== "active") return "free";
    if (profile.role === "admin") return "elite";
    const plan =
      subscription?.status === "active" || subscription?.status === "trialing"
        ? (subscription.plan as SubscriptionPlan)
        : "free";
    return membershipTierFromPlan(plan);
  }, [user, profile, subscription]);

  const value = useMemo<AuthState>(
    () => ({
      loading,
      enforced,
      clientConfigured,
      accessToken,
      user,
      profile,
      subscription,
      entitlements,
      membershipTier,
      isAdmin: profile?.role === "admin",
      isPending: profile?.accountStatus === "pending",
      isActive: profile?.accountStatus === "active",
      refresh,
      signInWithGoogle,
      signOut,
    }),
    [
      loading,
      enforced,
      clientConfigured,
      accessToken,
      user,
      profile,
      subscription,
      entitlements,
      membershipTier,
      refresh,
      signInWithGoogle,
      signOut,
    ],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

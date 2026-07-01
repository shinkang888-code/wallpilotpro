import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { entitlementsFor, isAuthEnforced } from "@/lib/auth/entitlements.server";
import {
  isTrialDemoMode,
  trialDemoGuestEntitlements,
  trialDemoMemberEntitlements,
} from "@/lib/membership/trial-demo";
import { getAuthDiagnostics } from "@/lib/auth/auth-diagnostics.server";
import { explainAuthSessionFailure, resolveAuthSession } from "@/lib/auth/session.server";
import { getServerConfig } from "@/lib/config.server";

const tokenInput = z.object({
  accessToken: z.string().nullable().optional(),
});

/** Publishable Supabase URL + anon key for browser auth (when VITE_* missing at build). */
export const getPublicAuthConfig = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseUrl, supabaseAnonKey } = getServerConfig();
  const diagnostics = getAuthDiagnostics();
  return {
    url: supabaseUrl,
    anonKey: supabaseAnonKey,
    isConfigured: Boolean(supabaseUrl && supabaseAnonKey),
    enforced: isAuthEnforced(),
    diagnostics,
  };
});

export const getAuthMe = createServerFn({ method: "POST" })
  .inputValidator(tokenInput)
  .handler(async ({ data }) => {
    const enforced = isAuthEnforced();
    if (!enforced) {
      return { enforced: false as const, session: null, entitlements: null };
    }
    const session = await resolveAuthSession(data.accessToken ?? null);
    if (!session) {
      return {
        enforced: true as const,
        session: null,
        entitlements: isTrialDemoMode() ? trialDemoGuestEntitlements() : null,
        sessionError: explainAuthSessionFailure(data.accessToken ?? null),
      };
    }
    return {
      enforced: true as const,
      session: {
        user: session.user,
        profile: session.profile,
        subscription: session.subscription,
      },
      entitlements: isTrialDemoMode()
        ? trialDemoMemberEntitlements()
        : entitlementsFor(session),
    };
  });

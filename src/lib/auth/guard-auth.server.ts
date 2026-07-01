import { assertEntitlement, isAuthEnforced } from "@/lib/auth/entitlements.server";
import { requireActiveSession, resolveAuthSession } from "@/lib/auth/session.server";
import { isGeminiKeyAvailable } from "@/lib/gemini/resolve-gemini-key.server";
import type { AuthSession, EntitlementFeature } from "@/lib/types/auth";

export async function guardFeature(
  accessToken: string | null | undefined,
  feature: EntitlementFeature,
  options?: { geminiApiKey?: string | null },
): Promise<AuthSession | null> {
  if (!isAuthEnforced()) return null;

  // BYOK: user's own Gemini key unlocks AI Pilot without Pro plan (login optional).
  if (feature === "ai_pilot" && isGeminiKeyAvailable(options?.geminiApiKey)) {
    if (!accessToken?.trim()) return null;

    const session = await resolveAuthSession(accessToken);
    if (!session) return null;

    if (session.profile.accountStatus === "suspended") throw new Error("account_suspended");
    if (session.profile.accountStatus === "deleted") throw new Error("account_deleted");
    if (session.profile.accountStatus === "pending") throw new Error("account_pending");
    if (session.profile.accountStatus !== "active") throw new Error("account_blocked");
    return session;
  }

  const session = await requireActiveSession(accessToken);
  assertEntitlement(session, feature);
  return session;
}

/** Agent Desk trial: all tiers + guest demo (read); writes need login when auth enforced. */
export async function guardAgentDeskTrial(
  accessToken: string | null | undefined,
  options?: { requireUser?: boolean; geminiApiKey?: string | null },
): Promise<AuthSession | null> {
  if (!isAuthEnforced()) return null;

  if (accessToken?.trim()) {
    const session = await resolveAuthSession(accessToken);
    if (session) {
      if (session.profile.accountStatus === "suspended") throw new Error("account_suspended");
      if (session.profile.accountStatus === "deleted") throw new Error("account_deleted");
      if (
        session.profile.accountStatus === "active" ||
        session.profile.accountStatus === "pending"
      ) {
        return session;
      }
      throw new Error("account_blocked");
    }
  }

  if (options?.requireUser) throw new Error("unauthorized");
  return null;
}

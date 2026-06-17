import type { SupabaseClient } from "@supabase/supabase-js";

import type { SubscriptionPlan, SubscriptionStatus } from "@/lib/types/auth";

type PaymentProvider = "stripe" | "danal" | "manual";

export async function applyFreeTier(
  admin: SupabaseClient,
  userId: string,
  opts?: { clearStripe?: boolean },
): Promise<void> {
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = {
    user_id: userId,
    plan: "free" satisfies SubscriptionPlan,
    status: "inactive" satisfies SubscriptionStatus,
    updated_at: now,
  };
  if (opts?.clearStripe) {
    patch.stripe_subscription_id = null;
  }
  await admin.from("subscriptions").upsert(patch);
}

export async function applyPaidTier(
  admin: SupabaseClient,
  userId: string,
  plan: SubscriptionPlan,
  opts?: {
    status?: SubscriptionStatus;
    provider?: PaymentProvider;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: string | null;
  },
): Promise<void> {
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan,
    status: opts?.status ?? "active",
    payment_provider: opts?.provider ?? "stripe",
    stripe_customer_id: opts?.stripeCustomerId,
    stripe_subscription_id: opts?.stripeSubscriptionId,
    current_period_end: opts?.currentPeriodEnd ?? null,
    updated_at: new Date().toISOString(),
  });
}

export async function applyManualPlanOverride(
  admin: SupabaseClient,
  userId: string,
  plan: SubscriptionPlan,
): Promise<void> {
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan,
    status: plan === "free" ? "inactive" : "active",
    payment_provider: "manual",
    updated_at: new Date().toISOString(),
  });
}

/** Stripe subscription statuses that should downgrade to Free. */
export const STRIPE_DOWNGRADE_STATUSES = new Set([
  "canceled",
  "unpaid",
  "past_due",
  "incomplete",
  "incomplete_expired",
]);

export function shouldDowngradeFromStripeStatus(stripeStatus: string): boolean {
  return STRIPE_DOWNGRADE_STATUSES.has(stripeStatus);
}

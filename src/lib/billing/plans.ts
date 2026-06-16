import { MEMBERSHIP_TIERS } from "@/lib/membership/tiers";
import type { SubscriptionPlan } from "@/lib/types/auth";

export type PlanDefinition = {
  id: SubscriptionPlan;
  name: { en: string; ko: string };
  priceLabel: { en: string; ko: string };
  stripePriceEnv: string;
  features: { en: string[]; ko: string[] };
};

/** Paid Stripe-backed plans (Day Trading + Premium + Elite). */
export const PLANS: PlanDefinition[] = MEMBERSHIP_TIERS.filter((t) => t.stripePlan).map((t) => ({
  id: t.stripePlan!,
  name: t.name,
  priceLabel: t.priceLabel,
  stripePriceEnv: t.stripePriceEnv!,
  features: t.features,
}));

export function planFromStripePriceId(
  priceId: string,
  prices: { basic: string; pro: string; premium: string; elite: string },
): SubscriptionPlan | null {
  if (priceId && priceId === prices.basic) return "basic";
  if (priceId && priceId === prices.pro) return "pro";
  if (priceId && priceId === prices.premium) return "premium";
  if (priceId && priceId === prices.elite) return "elite";
  return null;
}

import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { PLANS, planFromStripePriceId } from "@/lib/billing/plans";
import type { SubscriptionPlan } from "@/lib/types/auth";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeHeaders() {
  const { stripeSecretKey } = getServerConfig();
  if (!stripeSecretKey) throw new Error("stripe_not_configured");
  return {
    Authorization: `Bearer ${stripeSecretKey}`,
    "Content-Type": "application/x-www-form-urlencoded",
  };
}

async function stripePost(path: string, body: URLSearchParams) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: stripeHeaders(),
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const json = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) {
    throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  }
  return json;
}

function siteUrl() {
  const { authSiteUrl } = getServerConfig();
  return authSiteUrl.replace(/\/$/, "");
}

function priceIdForPlan(plan: SubscriptionPlan): string {
  const cfg = getServerConfig();
  const map: Record<string, string | undefined> = {
    basic: cfg.stripePriceBasic,
    pro: cfg.stripePricePro,
    premium: cfg.stripePricePremium,
    elite: cfg.stripePriceElite,
  };
  const id = map[plan];
  if (!id) throw new Error(`stripe_price_missing:${plan}`);
  return id;
}

export function isStripeConfigured(): boolean {
  const { stripeSecretKey } = getServerConfig();
  return Boolean(stripeSecretKey && PLANS.some((p) => Boolean(process.env[p.stripePriceEnv])));
}

export async function createStripeCheckout(
  userId: string,
  email: string,
  plan: SubscriptionPlan,
): Promise<{ url: string }> {
  if (plan === "free") throw new Error("invalid_plan");

  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const { data: sub } = await admin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .maybeSingle();

  let customerId = sub?.stripe_customer_id as string | undefined;
  if (!customerId) {
    const customer = await stripePost(
      "/customers",
      new URLSearchParams({ email, "metadata[user_id]": userId }),
    );
    customerId = customer.id as string;
    await admin.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      updated_at: new Date().toISOString(),
    });
  }

  const session = await stripePost(
    "/checkout/sessions",
    new URLSearchParams({
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceIdForPlan(plan),
      "line_items[0][quantity]": "1",
      success_url: `${siteUrl()}/pricing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/pricing?canceled=1`,
      "metadata[user_id]": userId,
      "metadata[plan]": plan,
    }),
  );

  const url = session.url as string | null;
  if (!url) throw new Error("stripe_no_checkout_url");
  return { url };
}

export async function syncCheckoutSession(sessionId: string, userId: string): Promise<{ ok: boolean }> {
  const admin = getSupabaseAdmin();
  if (!admin) return { ok: false };

  const sessionRes = await fetch(`${STRIPE_API}/checkout/sessions/${sessionId}`, {
    headers: stripeHeaders(),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  if (!sessionRes?.ok) return { ok: false };
  const session = (await sessionRes.json()) as Record<string, unknown> & {
    metadata?: { user_id?: string; plan?: SubscriptionPlan };
    subscription?: string;
  };
  if (session.metadata && (session.metadata as { user_id?: string }).user_id !== userId) {
    return { ok: false };
  }

  const subscriptionId = session.subscription as string | undefined;
  if (!subscriptionId) return { ok: false };

  const subRes = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: stripeHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!subRes.ok) return { ok: false };
  const sub = (await subRes.json()) as {
    status: string;
    current_period_end: number;
    items: { data: Array<{ price: { id: string } }> };
  };

  const priceId = sub.items.data[0]?.price.id;
  const cfg = getServerConfig();
  const plan =
    planFromStripePriceId(priceId, {
      basic: cfg.stripePriceBasic,
      pro: cfg.stripePricePro,
      premium: cfg.stripePricePremium,
      elite: cfg.stripePriceElite,
    }) ?? session.metadata?.plan ?? "pro";

  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan,
    status: sub.status === "active" || sub.status === "trialing" ? sub.status : "active",
    stripe_subscription_id: subscriptionId,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });

  return { ok: true };
}

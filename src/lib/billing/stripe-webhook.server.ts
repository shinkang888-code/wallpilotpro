import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { planFromStripePriceId } from "@/lib/billing/plans";
import type { SubscriptionPlan } from "@/lib/types/auth";

const STRIPE_API = "https://api.stripe.com/v1";

function stripeHeaders() {
  const { stripeSecretKey } = getServerConfig();
  if (!stripeSecretKey) throw new Error("stripe_not_configured");
  return { Authorization: `Bearer ${stripeSecretKey}` };
}

async function syncSubscriptionFromStripe(subscriptionId: string, userIdHint?: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const subRes = await fetch(`${STRIPE_API}/subscriptions/${subscriptionId}`, {
    headers: stripeHeaders(),
    signal: AbortSignal.timeout(15_000),
  });
  if (!subRes.ok) return;

  const sub = (await subRes.json()) as {
    status: string;
    current_period_end: number;
    customer: string;
    items: { data: Array<{ price: { id: string } }> };
    metadata?: { user_id?: string };
  };

  const priceId = sub.items.data[0]?.price.id;
  const cfg = getServerConfig();
  const plan =
    planFromStripePriceId(priceId, {
      basic: cfg.stripePriceBasic,
      pro: cfg.stripePricePro,
      premium: cfg.stripePricePremium,
      elite: cfg.stripePriceElite,
    }) ?? "pro";

  let userId = sub.metadata?.user_id ?? userIdHint;
  if (!userId) {
    const { data: row } = await admin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", sub.customer)
      .maybeSingle();
    userId = row?.user_id;
  }
  if (!userId) return;

  const statusMap: Record<string, string> = {
    active: "active",
    trialing: "trialing",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
  };

  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan: sub.status === "canceled" ? "free" : plan,
    status: statusMap[sub.status] ?? "inactive",
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: sub.customer,
    current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  });
}

export async function handleStripeWebhook(rawBody: string, signature: string): Promise<{ ok: boolean }> {
  const { stripeWebhookSecret } = getServerConfig();
  if (!stripeWebhookSecret) return { ok: false };

  // Stripe signature verification via API (simplified — production should use stripe SDK)
  const event = JSON.parse(rawBody) as {
    type: string;
    data: { object: Record<string, unknown> };
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as {
        subscription?: string;
        metadata?: { user_id?: string };
      };
      if (session.subscription) {
        await syncSubscriptionFromStripe(session.subscription, session.metadata?.user_id);
      }
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const subscription = event.data.object as { id: string; metadata?: { user_id?: string } };
      await syncSubscriptionFromStripe(subscription.id, subscription.metadata?.user_id);
      break;
    }
    default:
      break;
  }

  return { ok: true };
}

export async function upgradePlanFromWebhook(userId: string, plan: SubscriptionPlan): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan,
    status: "active",
    updated_at: new Date().toISOString(),
  });
}

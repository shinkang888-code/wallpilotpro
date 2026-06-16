import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { sendSubscriptionActivatedEmail } from "@/lib/email/email.server";
import type { SubscriptionPlan } from "@/lib/types/auth";

const DANAL_API = "https://one-api.danalpay.com";

export const DANAL_PLAN_AMOUNTS_KRW: Record<SubscriptionPlan, number> = {
  free: 0,
  basic: 39_000,
  pro: 39_000,
  premium: 99_000,
  elite: 199_000,
};

function siteUrl() {
  const { authSiteUrl } = getServerConfig();
  return authSiteUrl.replace(/\/$/, "");
}

function danalAuthHeader() {
  const { danalClientId, danalClientSecret } = getServerConfig();
  const token = Buffer.from(`${danalClientId}:${danalClientSecret}`).toString("base64");
  return { Authorization: `Basic ${token}`, "Content-Type": "application/json" };
}

export function isDanalConfigured(): boolean {
  const { danalClientId, danalClientSecret, danalMerchantId } = getServerConfig();
  return Boolean(danalClientId && danalClientSecret && danalMerchantId);
}

export function danalAmountForPlan(plan: SubscriptionPlan): number {
  return DANAL_PLAN_AMOUNTS_KRW[plan] ?? 0;
}

function userIdPrefix(userId: string): string {
  return userId.replace(/-/g, "").slice(0, 8).toLowerCase();
}

export function buildDanalOrderId(userId: string, plan: SubscriptionPlan): string {
  const ts = Date.now().toString(36);
  return `wp_${userIdPrefix(userId)}_${plan}_${ts}`.slice(0, 50);
}

export function parseDanalOrderId(orderId: string): { userIdPrefix: string; plan: SubscriptionPlan } | null {
  const match = /^wp_([a-z0-9]{8})_(basic|pro|premium|elite)_/i.exec(orderId);
  if (!match) return null;
  return { userIdPrefix: match[1].toLowerCase(), plan: match[2] as SubscriptionPlan };
}

export function danalOrderMatchesUser(orderId: string, userId: string, plan: SubscriptionPlan): boolean {
  const parsed = parseDanalOrderId(orderId);
  if (!parsed || parsed.plan !== plan) return false;
  return parsed.userIdPrefix === userIdPrefix(userId);
}

export async function prepareDanalBilling(
  userId: string,
  plan: SubscriptionPlan,
): Promise<{
  orderId: string;
  amount: number;
  merchantId: string;
  clientKey: string;
  successUrl: string;
  failUrl: string;
}> {
  if (plan === "free") throw new Error("invalid_plan");
  if (!isDanalConfigured()) throw new Error("danal_not_configured");

  const { danalMerchantId, danalClientKey } = getServerConfig();
  const orderId = buildDanalOrderId(userId, plan);
  const amount = danalAmountForPlan(plan);
  if (amount <= 0) throw new Error("invalid_plan_amount");

  return {
    orderId,
    amount,
    merchantId: danalMerchantId,
    clientKey: danalClientKey,
    successUrl: `${siteUrl()}/pricing?danal=success&orderId=${encodeURIComponent(orderId)}&plan=${plan}`,
    failUrl: `${siteUrl()}/pricing?danal=canceled`,
  };
}

async function danalPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${DANAL_API}${path}`, {
    method: "POST",
    headers: danalAuthHeader(),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(25_000),
  });
  const json = (await res.json()) as T & { code?: string; message?: string };
  if (!res.ok) {
    throw new Error(json.message ?? json.code ?? `danal_error_${res.status}`);
  }
  return json;
}

async function activateDanalSubscription(
  userId: string,
  email: string,
  plan: SubscriptionPlan,
  billingKey: string,
  transactionId: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const periodEnd = new Date();
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  await admin.from("subscriptions").upsert({
    user_id: userId,
    plan,
    status: "active",
    payment_provider: "danal",
    danal_billing_key: billingKey,
    danal_user_id: userId,
    danal_last_transaction_id: transactionId,
    current_period_end: periodEnd.toISOString(),
    updated_at: new Date().toISOString(),
  });

  void sendSubscriptionActivatedEmail(email, plan, "danal");
}

export async function completeDanalBilling(
  userId: string,
  email: string,
  plan: SubscriptionPlan,
  transactionId: string,
  orderId: string,
): Promise<{ ok: boolean; message?: string }> {
  if (!isDanalConfigured()) return { ok: false, message: "danal_not_configured" };

  if (!danalOrderMatchesUser(orderId, userId, plan)) return { ok: false, message: "invalid_order" };

  const { danalMerchantId } = getServerConfig();
  const amount = danalAmountForPlan(plan);

  try {
    const issue = await danalPost<{
      code: string;
      billingKey?: string;
      transactionId?: string;
    }>("/v1/billing/card/issue-key", {
      transactionId,
      merchantId: danalMerchantId,
    });

    const billingKey = issue.billingKey;
    if (!billingKey) return { ok: false, message: "billing_key_missing" };

    const confirm = await danalPost<{ code: string; transactionId?: string }>("/billing/confirm", {
      method: "CARD",
      billingKey,
      userId,
      amount,
      orderName: `WallPilot Pro ${plan}`,
      merchantId: danalMerchantId,
      orderId,
    });

    await activateDanalSubscription(
      userId,
      email,
      plan,
      billingKey,
      confirm.transactionId ?? transactionId,
    );
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "danal_failed" };
  }
}

/** Dev/demo fallback when Danal credentials are absent. */
export async function simulateDanalBilling(
  userId: string,
  email: string,
  plan: SubscriptionPlan,
  orderId: string,
): Promise<{ ok: boolean }> {
  if (process.env.NODE_ENV === "production") return { ok: false };
  if (!danalOrderMatchesUser(orderId, userId, plan)) return { ok: false };

  await activateDanalSubscription(userId, email, plan, `sim_${orderId}`, `sim_${Date.now()}`);
  return { ok: true };
}

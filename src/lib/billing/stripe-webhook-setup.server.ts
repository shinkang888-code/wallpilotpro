import process from "node:process";

import { getServerConfig } from "@/lib/config.server";
import { triggerVercelRedeploy, upsertVercelEnvVar } from "@/lib/integrations/vercel-env.server";

const STRIPE_API = "https://api.stripe.com/v1";
const DEFAULT_WEBHOOK_URL = "https://wallpilotpro.vercel.app/api/stripe/webhook";
const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

function stripeHeaders(secretKey: string) {
  return { Authorization: `Bearer ${secretKey}` };
}

function webhookUrl(): string {
  const { authSiteUrl } = getServerConfig();
  const base = authSiteUrl.replace(/\/$/, "");
  if (base.includes("localhost")) return DEFAULT_WEBHOOK_URL;
  return `${base}/api/stripe/webhook`;
}

async function stripeGet(path: string, secretKey: string) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: stripeHeaders(secretKey),
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  return json;
}

async function stripePost(path: string, secretKey: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: { ...stripeHeaders(secretKey), "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(20_000),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  return json;
}

export type StripeWebhookEnsureResult = {
  ok: boolean;
  message: string;
  created?: boolean;
  syncedToVercel?: boolean;
};

/** Create Stripe webhook endpoint if missing and persist STRIPE_WEBHOOK_SECRET to Vercel. */
export async function ensureStripeWebhookSecret(): Promise<StripeWebhookEnsureResult> {
  const cfg = getServerConfig();
  const secretKey = cfg.stripeSecretKey.trim();
  if (!secretKey) {
    return { ok: false, message: "stripe_not_configured" };
  }
  if (cfg.stripeWebhookSecret.trim()) {
    return { ok: true, message: "already_configured" };
  }

  const url = webhookUrl();
  const list = await stripeGet("/webhook_endpoints?limit=100", secretKey);
  let endpoint = (list.data ?? []).find((row: { url?: string }) => row.url === url);
  let created = false;

  if (!endpoint) {
    const params: Record<string, string> = { url, description: "WallPilot Pro" };
    EVENTS.forEach((evt, i) => {
      params[`enabled_events[${i}]`] = evt;
    });
    endpoint = await stripePost("/webhook_endpoints", secretKey, params);
    created = true;
  }

  const signingSecret = endpoint.secret as string | undefined;
  if (!signingSecret?.startsWith("whsec_")) {
    return { ok: false, message: "webhook_secret_missing" };
  }

  process.env.STRIPE_WEBHOOK_SECRET = signingSecret;

  let syncedToVercel = false;
  const { vercelAccessToken, vercelProjectId, vercelTeamId } = cfg;
  if (vercelAccessToken && vercelProjectId) {
    const saved = await upsertVercelEnvVar({
      token: vercelAccessToken,
      projectId: vercelProjectId,
      teamId: vercelTeamId || undefined,
      key: "STRIPE_WEBHOOK_SECRET",
      value: signingSecret,
    });
    if (!saved.ok) {
      return { ok: false, message: saved.message };
    }
    syncedToVercel = true;
    void triggerVercelRedeploy({
      token: vercelAccessToken,
      projectId: vercelProjectId,
      teamId: vercelTeamId || undefined,
    });
  }

  return {
    ok: true,
    message: syncedToVercel ? "webhook_secret_saved" : "webhook_secret_runtime_only",
    created,
    syncedToVercel,
  };
}

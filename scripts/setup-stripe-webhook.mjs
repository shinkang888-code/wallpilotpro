/**
 * Ensure Stripe webhook endpoint exists and sync STRIPE_WEBHOOK_SECRET to Vercel.
 *
 * Usage:
 *   node --env-file=.env.stripe-setup scripts/setup-stripe-webhook.mjs
 *   node --env-file=.env.stripe-setup scripts/setup-stripe-webhook.mjs --vercel-cli
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const STRIPE_API = "https://api.stripe.com/v1";
const WEBHOOK_URL = process.env.STRIPE_WEBHOOK_URL ?? "https://wallpilotpro.vercel.app/api/stripe/webhook";
const EVENTS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
if (!secretKey) {
  console.error("FAIL: set STRIPE_SECRET_KEY");
  process.exit(1);
}

async function stripeGet(path) {
  const res = await fetch(`${STRIPE_API}${path}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  return json;
}

async function stripePost(path, params) {
  const body = new URLSearchParams(params);
  const res = await fetch(`${STRIPE_API}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  return json;
}

function addVercelEnv(name, value) {
  execSync(`vercel env add ${name} production --force --yes`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function main() {
  console.log("=== Stripe Webhook Setup ===\n");
  console.log("Target URL:", WEBHOOK_URL);

  const list = await stripeGet("/webhook_endpoints?limit=100");
  let endpoint = (list.data ?? []).find((row) => row.url === WEBHOOK_URL);

  if (!endpoint) {
    const params = { url: WEBHOOK_URL, description: "WallPilot Pro production" };
    EVENTS.forEach((evt, i) => {
      params[`enabled_events[${i}]`] = evt;
    });
    endpoint = await stripePost("/webhook_endpoints", params);
    console.log("Created webhook endpoint:", endpoint.id);
  } else {
    console.log("Found existing webhook endpoint:", endpoint.id);
  }

  const secret = endpoint.secret;
  if (!secret?.startsWith("whsec_")) {
    throw new Error("Webhook endpoint has no signing secret — recreate in Stripe Dashboard");
  }

  console.log("Signing secret: whsec_… (not printed)");

  if (process.argv.includes("--vercel-cli") || process.env.WP_SYNC_VERCEL === "1") {
    console.log("\nSyncing STRIPE_WEBHOOK_SECRET to Vercel production...");
    addVercelEnv("STRIPE_WEBHOOK_SECRET", secret);
    console.log("Done.");
  } else {
    console.log("\nRun with --vercel-cli to push STRIPE_WEBHOOK_SECRET to Vercel.");
  }
}

main().catch((err) => {
  console.error("\nFAIL:", err.message);
  process.exit(1);
});

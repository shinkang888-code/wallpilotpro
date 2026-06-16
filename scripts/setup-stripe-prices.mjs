/**
 * Create WallPilot Pro subscription products/prices in Stripe (test mode).
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-prices.mjs
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/setup-stripe-prices.mjs --vercel-cli
 *
 * Requires a valid Stripe secret key (sk_test_ or rk_ after sandbox claim + stripe login).
 */
import { execSync } from "node:child_process";

const STRIPE_API = "https://api.stripe.com/v1";
const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

if (!secretKey) {
  console.error("FAIL: set STRIPE_SECRET_KEY (sk_test_... or restricted rk_ key)");
  process.exit(1);
}

const PLANS = [
  { env: "STRIPE_PRICE_PRO", name: "WallPilot Pro — Day Trading", amount: 2900 },
  { env: "STRIPE_PRICE_PREMIUM", name: "WallPilot Pro — Premium", amount: 5900 },
  { env: "STRIPE_PRICE_ELITE", name: "WallPilot Pro — Elite", amount: 9900 },
];

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
  if (!res.ok) {
    throw new Error(json.error?.message ?? `stripe_error_${res.status}`);
  }
  return json;
}

function addVercelEnv(name, value) {
  execSync(`vercel env add ${name} production --force --yes`, {
    input: value,
    stdio: ["pipe", "inherit", "inherit"],
  });
}

async function main() {
  console.log("=== Stripe Price Setup ===\n");

  const created = {};

  for (const plan of PLANS) {
    const product = await stripePost("/products", {
      name: plan.name,
      "metadata[wallpilotpro_plan]": plan.env,
    });

    const price = await stripePost("/prices", {
      product: product.id,
      currency: "usd",
      "recurring[interval]": "month",
      unit_amount: String(plan.amount),
    });

    created[plan.env] = price.id;
    console.log(`${plan.env}=${price.id}  (${plan.name}, $${plan.amount / 100}/mo)`);
  }

  console.log("\nAdd to Vercel production:");
  for (const [key, value] of Object.entries(created)) {
    console.log(`  vercel env add ${key} production --force --yes  # ${value}`);
  }

  if (process.argv.includes("--vercel-cli")) {
    console.log("\nSyncing to Vercel...");
    addVercelEnv("STRIPE_SECRET_KEY", secretKey);
    for (const [key, value] of Object.entries(created)) {
      addVercelEnv(key, value);
    }
    console.log("Done. Set STRIPE_WEBHOOK_SECRET manually in Stripe Dashboard → Webhooks.");
  }
}

main().catch((err) => {
  console.error("\nFAIL:", err.message);
  if (String(err.message).includes("Invalid API Key")) {
    console.error(
      "Hint: run `stripe sandbox claim` in a browser, then `stripe login`, and use the sk_test_ key.",
    );
  }
  process.exit(1);
});

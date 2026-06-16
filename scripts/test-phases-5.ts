/**
 * WallPilot Pro Phase 5 — billing, email, webhooks.
 */
import assert from "node:assert/strict";

import {
  buildDanalOrderId,
  danalAmountForPlan,
  danalOrderMatchesUser,
  isDanalConfigured,
  parseDanalOrderId,
} from "../src/lib/billing/danal.server";
import { verifyStripeWebhookSignature } from "../src/lib/billing/stripe-verify.server";
import { isEmailConfigured } from "../src/lib/email/email.server";
import { isStripeConfigured } from "../src/lib/billing/stripe.server";

console.log("WallPilot Pro Phase 5 tests\n");

// Stripe webhook signature (Stripe docs test vector pattern)
const secret = "whsec_test_secret";
const timestamp = Math.floor(Date.now() / 1000).toString();
const payload = '{"type":"ping"}';
const crypto = await import("node:crypto");
const signed = crypto.createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
const header = `t=${timestamp},v1=${signed}`;
assert.equal(verifyStripeWebhookSignature(payload, header, secret), true);
assert.equal(verifyStripeWebhookSignature(payload, "t=0,v1=bad", secret), false);

// Danal order helpers
const userId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
const orderId = buildDanalOrderId(userId, "premium");
assert.ok(parseDanalOrderId(orderId));
assert.equal(danalOrderMatchesUser(orderId, userId, "premium"), true);
assert.equal(danalOrderMatchesUser(orderId, userId, "elite"), false);
assert.equal(danalAmountForPlan("pro"), 39_000);
assert.equal(danalAmountForPlan("elite"), 199_000);

// Config helpers (no env required for boolean checks)
assert.equal(typeof isStripeConfigured(), "boolean");
assert.equal(typeof isDanalConfigured(), "boolean");
assert.equal(typeof isEmailConfigured(), "boolean");

console.log("✓ All Phase 5 checks passed");

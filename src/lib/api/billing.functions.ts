import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireActiveSession } from "@/lib/auth/session.server";
import {
  completeDanalBilling,
  isDanalConfigured,
  prepareDanalBilling,
  simulateDanalBilling,
} from "@/lib/billing/danal.server";
import {
  createStripeCheckout,
  createStripePortalSession,
  isStripeConfigured,
  syncCheckoutSession,
} from "@/lib/billing/stripe.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";

export const getBillingStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().optional() }))
  .handler(async ({ data }) => {
    let paymentProvider: string | null = null;
    let hasStripeCustomer = false;
    let canManagePortal = false;

    if (data.accessToken) {
      try {
        const session = await requireActiveSession(data.accessToken);
        const admin = getSupabaseAdmin();
        if (admin) {
          const { data: sub } = await admin
            .from("subscriptions")
            .select("payment_provider, stripe_customer_id, status")
            .eq("user_id", session.user.id)
            .maybeSingle();
          paymentProvider = sub?.payment_provider ?? null;
          hasStripeCustomer = Boolean(sub?.stripe_customer_id);
          canManagePortal =
            Boolean(sub?.stripe_customer_id) &&
            sub?.payment_provider === "stripe" &&
            (sub?.status === "active" || sub?.status === "trialing" || sub?.status === "past_due");
        }
      } catch {
        /* anonymous billing status */
      }
    }

    return {
      stripeConfigured: isStripeConfigured(),
      danalConfigured: isDanalConfigured(),
      paymentProvider,
      hasStripeCustomer,
      canManagePortal,
    };
  });

export const startCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      plan: z.enum(["pro", "premium", "elite"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireActiveSession(data.accessToken);
    return createStripeCheckout(session.user.id, session.user.email, data.plan);
  });

export const confirmCheckoutSession = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      sessionId: z.string().min(10),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireActiveSession(data.accessToken);
    return syncCheckoutSession(data.sessionId, session.user.id);
  });

export const openCustomerPortal = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(20) }))
  .handler(async ({ data }) => {
    const session = await requireActiveSession(data.accessToken);
    return createStripePortalSession(session.user.id);
  });

export const prepareDanalCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      plan: z.enum(["pro", "premium", "elite"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireActiveSession(data.accessToken);
    return prepareDanalBilling(session.user.id, data.plan);
  });

export const completeDanalCheckout = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      plan: z.enum(["pro", "premium", "elite"]),
      transactionId: z.string().min(10),
      orderId: z.string().min(10),
      simulate: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireActiveSession(data.accessToken);

    if (data.simulate && !isDanalConfigured()) {
      return simulateDanalBilling(session.user.id, session.user.email, data.plan, data.orderId);
    }

    return completeDanalBilling(
      session.user.id,
      session.user.email,
      data.plan,
      data.transactionId,
      data.orderId,
    );
  });

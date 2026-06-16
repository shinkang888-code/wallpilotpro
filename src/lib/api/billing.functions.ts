import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireActiveSession } from "@/lib/auth/session.server";
import { createStripeCheckout, isStripeConfigured, syncCheckoutSession } from "@/lib/billing/stripe.server";

export const getBillingStatus = createServerFn({ method: "POST" })
  .inputValidator(z.object({}))
  .handler(async () => ({ stripeConfigured: isStripeConfigured() }));

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

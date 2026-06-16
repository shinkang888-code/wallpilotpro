import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { runSecurityAudit, listSecurityAudits } from "@/lib/security/audit.server";
import { requireAdminSession } from "@/lib/auth/session.server";

export const adminRunSecurityAudit = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(20) }))
  .handler(async ({ data }) => {
    const session = await requireAdminSession(data.accessToken);
    return runSecurityAudit(session.user.id);
  });

export const adminListSecurityAudits = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(20) }))
  .handler(async ({ data }) => {
    await requireAdminSession(data.accessToken);
    return listSecurityAudits();
  });

export const stripeWebhookHandler = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      rawBody: z.string(),
      signature: z.string(),
    }),
  )
  .handler(async ({ data }) => {
    const { handleStripeWebhook } = await import("@/lib/billing/stripe-webhook.server");
    return handleStripeWebhook(data.rawBody, data.signature);
  });

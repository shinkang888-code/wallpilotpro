import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { logUserActivity, listUserActivity } from "@/lib/db/activity-log.server";
import { requireActiveSession, requireAdminSession } from "@/lib/auth/session.server";

export const trackActivity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().optional(),
      eventType: z.enum(["login", "logout", "page_view", "feature_execute", "pdf_export", "menu_denied"]),
      menuId: z.string().optional(),
      detail: z.record(z.unknown()).optional(),
    }),
  )
  .handler(async ({ data }) => {
    let userId: string | null = null;
    if (data.accessToken) {
      try {
        const session = await requireActiveSession(data.accessToken);
        userId = session.user.id;
      } catch {
        userId = null;
      }
    }

    await logUserActivity({
      userId,
      eventType: data.eventType,
      menuId: data.menuId ?? null,
      detail: data.detail as Record<string, string | number | boolean | null> | undefined,
    });

    return { ok: true };
  });

export const adminListActivity = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      limit: z.number().int().min(1).max(500).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireAdminSession(data.accessToken);
    return listUserActivity(data.limit ?? 100);
  });

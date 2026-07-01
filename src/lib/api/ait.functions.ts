import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardFeature } from "@/lib/auth/guard-auth.server";
import { requireActiveSession } from "@/lib/auth/session.server";
import { logUserActivity } from "@/lib/db/activity-log.server";
import {
  addSignalReply,
  createSignal,
  listSignalFeed,
  listSignalReplies,
} from "@/lib/modules/ait/signals.server";
import type { AitFeedResponse, AitMessageType, AitSignal, AitSignalReply } from "@/lib/modules/ait/types";

const messageTypeSchema = z.enum(["operation", "strategy", "discussion"]).optional();

export const getSignalFeed = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      messageType: messageTypeSchema,
      limit: z.number().int().min(1).max(50).optional(),
      offset: z.number().int().min(0).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AitFeedResponse> => {
    await guardFeature(data.accessToken, "signals_read");
    return listSignalFeed({
      messageType: data.messageType as AitMessageType | undefined,
      limit: data.limit,
      offset: data.offset,
    });
  });

export const publishSignal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      messageType: z.enum(["operation", "strategy", "discussion"]),
      market: z.string().min(1),
      symbol: z.string().optional(),
      side: z.string().optional(),
      title: z.string().optional(),
      content: z.string().min(3).max(4000),
      tags: z.array(z.string()).optional(),
    }),
  )
  .handler(async ({ data }): Promise<AitSignal> => {
    const session = await guardFeature(data.accessToken, "signals_write");
    if (!session) throw new Error("unauthorized");
    const signal = await createSignal({
      authorId: session.user.id,
      authorName: session.profile.displayName ?? session.user.email.split("@")[0],
      messageType: data.messageType,
      market: data.market,
      symbol: data.symbol,
      side: data.side,
      title: data.title,
      content: data.content,
      tags: data.tags,
    });

    void logUserActivity({
      userId: session.user.id,
      eventType: "feature_execute",
      menuId: "signal_hub",
      detail: { action: "publish", messageType: data.messageType },
    });

    return signal;
  });

export const getSignalReplies = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      signalId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }): Promise<AitSignalReply[]> => {
    await guardFeature(data.accessToken, "signals_read");
    return listSignalReplies(data.signalId);
  });

export const postSignalReply = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      signalId: z.string().uuid(),
      content: z.string().min(1).max(2000),
    }),
  )
  .handler(async ({ data }): Promise<AitSignalReply> => {
    const session = await guardFeature(data.accessToken, "signals_write");
    if (!session) throw new Error("unauthorized");
    return addSignalReply({
      signalId: data.signalId,
      authorId: session.user.id,
      authorName: session.profile.displayName ?? session.user.email.split("@")[0],
      content: data.content,
    });
  });

export const trackSignalHubView = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().nullable().optional() }))
  .handler(async ({ data }) => {
    try {
      const session = await requireActiveSession(data.accessToken ?? null);
      void logUserActivity({
        userId: session.user.id,
        eventType: "page_view",
        menuId: "signal_hub",
      });
    } catch {
      /* anonymous preview ok for free tier read */
    }
    return { ok: true };
  });

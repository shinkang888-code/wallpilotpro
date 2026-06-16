import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardFeature } from "@/lib/auth/guard-auth.server";
import { logUserActivity } from "@/lib/db/activity-log.server";
import { createRlJob, getRlJob, listRlJobs, listRlPresets } from "@/lib/modules/tm/rl-lab.server";
import type { TmRlJob } from "@/lib/modules/tm/types";

export const getRlLabPresets = createServerFn({ method: "POST" }).handler(async () => listRlPresets());

export const runRlBacktest = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      task: z.string().min(1),
      dataset: z.string().min(1),
      agent: z.string().min(1),
      tickers: z.array(z.string()).optional(),
      mode: z.enum(["backtest", "train", "regime_label", "regime_test"]).optional(),
    }),
  )
  .handler(async ({ data }): Promise<TmRlJob> => {
    const session = await guardFeature(data.accessToken, "rl_lab");
    const job = await createRlJob({
      userId: session.user.id,
      mode: data.mode ?? "backtest",
      task: data.task,
      dataset: data.dataset,
      agent: data.agent,
      tickers: data.tickers,
    });

    void logUserActivity({
      userId: session.user.id,
      eventType: "feature_execute",
      menuId: "rl_lab",
      detail: { jobId: job.id, source: job.source, task: data.task },
    });

    return job;
  });

export const fetchRlJob = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      jobId: z.string().uuid(),
    }),
  )
  .handler(async ({ data }): Promise<TmRlJob | null> => {
    const session = await guardFeature(data.accessToken, "rl_lab");
    return getRlJob(session.user.id, data.jobId);
  });

export const fetchRlJobHistory = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().nullable().optional(),
      limit: z.number().int().min(1).max(20).optional(),
    }),
  )
  .handler(async ({ data }): Promise<TmRlJob[]> => {
    const session = await guardFeature(data.accessToken, "rl_lab");
    return listRlJobs(session.user.id, data.limit ?? 10);
  });

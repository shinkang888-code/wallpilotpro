import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { runDecisionReflection } from "@/lib/db/reflection.server";

export const runReflectionBatch = createServerFn({ method: "POST" })
  .inputValidator(z.object({ minAgeDays: z.number().int().min(1).max(90).optional() }))
  .handler(async ({ data }) => runDecisionReflection(data.minAgeDays ?? 5));

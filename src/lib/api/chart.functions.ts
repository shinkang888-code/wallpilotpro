import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchStockChartSeries } from "@/lib/api/chart-data.server";
import { guardFeature } from "@/lib/auth/guard-auth.server";
import type { ChartInterval } from "@/lib/types/chart";

export const getStockChart = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      ticker: z.string().min(1),
      market: z.enum(["KR", "US"]),
      interval: z.enum(["1d", "1wk", "1mo"] satisfies [ChartInterval, ...ChartInterval[]]),
      accessToken: z.string().nullable().optional(),
      tossKey: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    await guardFeature(data.accessToken, "chart");
    return fetchStockChartSeries(data.ticker, data.market, data.interval, {
      tossKey: data.tossKey,
    });
  });

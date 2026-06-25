import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardFeature } from "@/lib/auth/guard-auth.server";
import {
  demoBacktestHighlight,
  fetchFtBotStatus,
  fetchFtOpenTrades,
  fetchFtProfit,
  probeFreqtradeConnection,
} from "@/lib/modules/ft/ft-client.server";
import type { FtDashboardSnapshot } from "@/lib/modules/ft/types";

export const getCryptoBotDashboard = createServerFn({ method: "POST" })
  .handler(async (): Promise<FtDashboardSnapshot> => {
    const connection = await probeFreqtradeConnection();
    if (!connection.online) {
      return {
        connection,
        status: null,
        profit: null,
        openTrades: null,
        demoBacktest: demoBacktestHighlight(),
      };
    }

    const [status, profit, openTrades] = await Promise.all([
      fetchFtBotStatus(),
      fetchFtProfit(),
      fetchFtOpenTrades(),
    ]);

    return {
      connection,
      status,
      profit,
      openTrades,
      demoBacktest: demoBacktestHighlight(),
    };
  });

export const getCryptoBotConnection = createServerFn({ method: "POST" }).handler(async () =>
  probeFreqtradeConnection(),
);

export const refreshCryptoBotLive = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().nullable().optional() }))
  .handler(async ({ data }) => {
    await guardFeature(data.accessToken ?? null, "crypto_bot");
    const connection = await probeFreqtradeConnection();
    if (!connection.online) {
      return { connection, status: null, profit: null, openTrades: null };
    }
    const [status, profit, openTrades] = await Promise.all([
      fetchFtBotStatus(),
      fetchFtProfit(),
      fetchFtOpenTrades(),
    ]);
    return { connection, status, profit, openTrades };
  });

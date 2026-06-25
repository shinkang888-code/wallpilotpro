import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { fetchTossTraderSnapshot } from "@/lib/api/toss-bridge.server";
import type { TossTraderSnapshot } from "@/lib/api/toss-trader.types";
import {
  demoBacktestHighlight,
  fetchFtBotStatus,
  fetchFtOpenTradeCount,
  fetchFtProfit,
  probeFreqtradeConnection,
} from "@/lib/modules/ft/ft-client.server";
import type { FtDashboardSnapshot } from "@/lib/modules/ft/types";

export type TossTraderDashboardPayload = {
  toss: TossTraderSnapshot;
  crypto: FtDashboardSnapshot;
};

export const getTossTraderDashboard = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(1),
    }),
  )
  .handler(async ({ data }): Promise<TossTraderDashboardPayload> => {
    const [toss, connection] = await Promise.all([
      fetchTossTraderSnapshot(data.accessToken),
      probeFreqtradeConnection(),
    ]);

    let crypto: FtDashboardSnapshot = {
      connection,
      status: null,
      profit: null,
      openTrades: null,
      demoBacktest: demoBacktestHighlight(),
    };

    if (connection.online) {
      const [status, profit, openTrades] = await Promise.all([
        fetchFtBotStatus(),
        fetchFtProfit(),
        fetchFtOpenTradeCount(),
      ]);
      crypto = { connection, status, profit, openTrades, demoBacktest: demoBacktestHighlight() };
    }

    return { toss, crypto };
  });

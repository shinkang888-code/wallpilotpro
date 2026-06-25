import { getServerConfig } from "@/lib/config.server";
import type {
  FtBacktestHighlight,
  FtBotStatus,
  FtConnectionStatus,
  FtOpenTradeCount,
  FtProfitSummary,
} from "@/lib/modules/ft/types";

const DEMO_BACKTEST: FtBacktestHighlight = {
  periodDays: 29,
  totalTrades: 30,
  winRate: 80,
  profitPct: -0.99,
  maxDrawdownPct: 1.12,
  pairs: ["BTC/USDT", "ETH/USDT"],
  strategy: "SampleStrategy",
};

function ftConfig() {
  const {
    freqtradeApiUrl,
    freqtradeApiUser,
    freqtradeApiPassword,
  } = getServerConfig();
  return {
    apiUrl: freqtradeApiUrl.replace(/\/$/, ""),
    user: freqtradeApiUser,
    password: freqtradeApiPassword,
    configured: Boolean(freqtradeApiUrl),
  };
}

async function ftFetch<T>(path: string): Promise<T> {
  const { apiUrl, user, password } = ftConfig();
  const started = Date.now();
  const auth = Buffer.from(`${user}:${password}`).toString("base64");
  const res = await fetch(`${apiUrl}${path}`, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) {
    throw new Error(`freqtrade_http_${res.status}`);
  }
  const latencyMs = Date.now() - started;
  const data = (await res.json()) as T;
  void latencyMs;
  return data;
}

export function demoBacktestHighlight(): FtBacktestHighlight {
  return DEMO_BACKTEST;
}

export async function probeFreqtradeConnection(): Promise<FtConnectionStatus> {
  const { apiUrl, configured } = ftConfig();
  if (!configured) {
    return {
      online: false,
      configured: false,
      latencyMs: null,
      apiUrl,
      error: "not_configured",
    };
  }

  const started = Date.now();
  try {
    await ftFetch<{ status: string }>("/api/v1/ping");
    return {
      online: true,
      configured: true,
      latencyMs: Date.now() - started,
      apiUrl,
      error: null,
    };
  } catch (e) {
    return {
      online: false,
      configured: true,
      latencyMs: null,
      apiUrl,
      error: e instanceof Error ? e.message : "connection_failed",
    };
  }
}

export async function fetchFtBotStatus(): Promise<FtBotStatus | null> {
  try {
    const [showConfig, status] = await Promise.all([
      ftFetch<Record<string, unknown>>("/api/v1/show_config"),
      ftFetch<{ state: string; dry_run?: boolean }>("/api/v1/status"),
    ]);

    const exchange = showConfig.exchange as Record<string, unknown> | undefined;
    const pairWhitelist = (exchange?.pair_whitelist as string[] | undefined) ?? [];

    return {
      state: status.state,
      dryRun: Boolean(status.dry_run ?? showConfig.dry_run),
      strategy: (showConfig.strategy as string | undefined) ?? null,
      exchange: (exchange?.name as string | undefined) ?? null,
      timeframe: (showConfig.timeframe as string | undefined) ?? null,
      stakeCurrency: (showConfig.stake_currency as string | undefined) ?? null,
      stakeAmount: Number(showConfig.stake_amount ?? 0) || null,
      maxOpenTrades: Number(showConfig.max_open_trades ?? 0) || null,
      pairWhitelist,
    };
  } catch {
    return null;
  }
}

export async function fetchFtProfit(): Promise<FtProfitSummary | null> {
  try {
    const profit = await ftFetch<Record<string, unknown>>("/api/v1/profit");
    return {
      profitClosedCoin: Number(profit.profit_closed_coin ?? 0),
      profitClosedPercent: Number(profit.profit_closed_percent ?? 0),
      profitAllCoin: Number(profit.profit_all_coin ?? 0),
      tradeCount: Number(profit.trade_count ?? 0),
      winRate: profit.winrate != null ? Number(profit.winrate) : null,
    };
  } catch {
    return null;
  }
}

export async function fetchFtOpenTrades(): Promise<FtOpenTradeCount | null> {
  try {
    const count = await ftFetch<Record<string, unknown>>("/api/v1/count");
    return {
      current: Number(count.current ?? 0),
      max: Number(count.max ?? 0),
      totalStake: Number(count.total_stake ?? 0),
    };
  } catch {
    return null;
  }
}

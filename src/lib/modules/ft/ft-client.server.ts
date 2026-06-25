import { getServerConfig } from "@/lib/config.server";
import type {
  FtBacktestHighlight,
  FtBotStatus,
  FtConnectionStatus,
  FtControlAction,
  FtControlResult,
  FtForceExitResult,
  FtOpenTrade,
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
  return (await res.json()) as T;
}

async function ftPost<T>(path: string, body?: unknown): Promise<T> {
  const { apiUrl, user, password } = ftConfig();
  const auth = Buffer.from(`${user}:${password}`).toString("base64");
  const res = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) {
    throw new Error(`freqtrade_http_${res.status}`);
  }
  return (await res.json()) as T;
}

const CONTROL_PATH: Record<FtControlAction, string> = {
  start: "/api/v1/start",
  stop: "/api/v1/stop",
  pause: "/api/v1/pause",
  reload: "/api/v1/reload_config",
};

export async function controlFtBot(action: FtControlAction): Promise<FtControlResult> {
  try {
    const res = await ftPost<{ status?: string }>(CONTROL_PATH[action]);
    return {
      ok: true,
      action,
      status: res.status ?? null,
      message: res.status ?? `${action} sent`,
    };
  } catch (e) {
    return {
      ok: false,
      action,
      status: null,
      message: e instanceof Error ? e.message : "control_failed",
    };
  }
}

export async function forceExitAllFt(): Promise<FtForceExitResult> {
  try {
    const res = await ftPost<{ result?: string }>("/api/v1/forceexit", {
      tradeid: "all",
    });
    return { ok: true, message: res.result ?? "force exit sent" };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "forceexit_failed",
    };
  }
}

type FtRawOpenTrade = {
  trade_id?: number;
  pair?: string;
  is_open?: boolean;
  amount?: number;
  open_rate?: number;
  current_rate?: number | null;
  stake_amount?: number;
  profit_pct?: number | null;
  profit_abs?: number | null;
  open_date?: string;
};

export async function fetchFtOpenTrades(): Promise<FtOpenTrade[]> {
  try {
    const trades = await ftFetch<FtRawOpenTrade[]>("/api/v1/status");
    if (!Array.isArray(trades)) return [];
    return trades.map((trd) => ({
      tradeId: Number(trd.trade_id ?? 0),
      pair: trd.pair ?? "—",
      isOpen: Boolean(trd.is_open),
      amount: Number(trd.amount ?? 0),
      openRate: Number(trd.open_rate ?? 0),
      currentRate: trd.current_rate != null ? Number(trd.current_rate) : null,
      stakeAmount: Number(trd.stake_amount ?? 0),
      profitPct: trd.profit_pct != null ? Number(trd.profit_pct) : null,
      profitAbs: trd.profit_abs != null ? Number(trd.profit_abs) : null,
      openDate: trd.open_date ?? "",
    }));
  } catch {
    return [];
  }
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
    const [showConfig, whitelist] = await Promise.all([
      ftFetch<Record<string, unknown>>("/api/v1/show_config"),
      ftFetch<{ whitelist?: string[] }>("/api/v1/whitelist").catch(() => ({
        whitelist: [] as string[],
      })),
    ]);

    const exchangeRaw = showConfig.exchange;
    const exchangeName =
      typeof exchangeRaw === "string"
        ? exchangeRaw
        : ((exchangeRaw as Record<string, unknown> | undefined)?.name as string | undefined) ??
          null;

    return {
      state: (showConfig.state as string | undefined) ?? "unknown",
      dryRun: Boolean(showConfig.dry_run),
      strategy: (showConfig.strategy as string | undefined) ?? null,
      exchange: exchangeName,
      timeframe: (showConfig.timeframe as string | undefined) ?? null,
      stakeCurrency: (showConfig.stake_currency as string | undefined) ?? null,
      stakeAmount: Number(showConfig.stake_amount ?? 0) || null,
      maxOpenTrades: Number(showConfig.max_open_trades ?? 0) || null,
      pairWhitelist: whitelist.whitelist ?? [],
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

export async function fetchFtOpenTradeCount(): Promise<FtOpenTradeCount | null> {
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

import type {
  FtBacktestHighlight,
  FtBotStatus,
  FtConnectionStatus,
  FtControlAction,
  FtControlResult,
  FtDashboardSnapshot,
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

const API_URL = (
  import.meta.env.VITE_WALLPILOT_CRYPTO_API_URL ??
  import.meta.env.VITE_FREQTRADE_API_URL ??
  "http://127.0.0.1:8080"
).replace(/\/$/, "");
const API_USER =
  import.meta.env.VITE_WALLPILOT_CRYPTO_API_USER ??
  import.meta.env.VITE_FREQTRADE_API_USER ??
  "wallpilot";
const API_PASSWORD =
  import.meta.env.VITE_WALLPILOT_CRYPTO_API_PASSWORD ??
  import.meta.env.VITE_FREQTRADE_API_PASSWORD ??
  "wallpilot";

function authHeader(): string {
  return `Basic ${btoa(`${API_USER}:${API_PASSWORD}`)}`;
}

async function browserFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(4_000),
  });
  if (!res.ok) throw new Error(`crypto_engine_http_${res.status}`);
  return (await res.json()) as T;
}

async function browserPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(6_000),
  });
  if (!res.ok) throw new Error(`crypto_engine_http_${res.status}`);
  return (await res.json()) as T;
}

const CONTROL_PATH: Record<FtControlAction, string> = {
  start: "/api/v1/start",
  stop: "/api/v1/stop",
  pause: "/api/v1/pause",
  reload: "/api/v1/reload_config",
};

export async function controlFtBotBrowser(
  action: FtControlAction,
): Promise<FtControlResult> {
  try {
    const res = await browserPost<{ status?: string }>(CONTROL_PATH[action]);
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

export async function forceExitAllFtBrowser(): Promise<FtForceExitResult> {
  try {
    const res = await browserPost<{ result?: string }>("/api/v1/forceexit", {
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

export async function fetchFtOpenTradesBrowser(): Promise<FtOpenTrade[]> {
  try {
    const trades = await browserFetch<FtRawOpenTrade[]>("/api/v1/status");
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

/** True when the page is HTTPS but the bot URL is plain HTTP (mixed-content blocked). */
export function isMixedContentBlocked(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.protocol === "https:" && API_URL.startsWith("http:");
}

export function cryptoEngineApiUrl(): string {
  return API_URL;
}

function parseShowConfig(cfg: Record<string, unknown>): FtBotStatus {
  const exchangeRaw = cfg.exchange;
  const exchangeName =
    typeof exchangeRaw === "string"
      ? exchangeRaw
      : ((exchangeRaw as Record<string, unknown> | undefined)?.name as string | undefined) ??
        null;

  return {
    state: (cfg.state as string | undefined) ?? "unknown",
    dryRun: Boolean(cfg.dry_run),
    strategy: (cfg.strategy as string | undefined) ?? null,
    exchange: exchangeName,
    timeframe: (cfg.timeframe as string | undefined) ?? null,
    stakeCurrency: (cfg.stake_currency as string | undefined) ?? null,
    stakeAmount: Number(cfg.stake_amount ?? 0) || null,
    maxOpenTrades: Number(cfg.max_open_trades ?? 0) || null,
    pairWhitelist: [],
  };
}

/** Probe local crypto engine from the user's browser (works when WallPilot runs on Vercel). */
export async function probeCryptoEngineBrowser(): Promise<FtConnectionStatus> {
  const started = Date.now();
  try {
    await browserFetch<{ status: string }>("/api/v1/ping");
    return {
      online: true,
      configured: true,
      latencyMs: Date.now() - started,
      apiUrl: API_URL,
      error: null,
    };
  } catch (e) {
    return {
      online: false,
      configured: true,
      latencyMs: null,
      apiUrl: API_URL,
      error: e instanceof Error ? e.message : "connection_failed",
    };
  }
}

export async function fetchFtDashboardBrowser(): Promise<FtDashboardSnapshot | null> {
  const connection = await probeCryptoEngineBrowser();
  if (!connection.online) return null;

  try {
    const [showConfig, whitelist, profit, count] = await Promise.all([
      browserFetch<Record<string, unknown>>("/api/v1/show_config"),
      browserFetch<{ whitelist?: string[] }>("/api/v1/whitelist").catch(() => ({
        whitelist: [] as string[],
      })),
      browserFetch<Record<string, unknown>>("/api/v1/profit"),
      browserFetch<Record<string, unknown>>("/api/v1/count"),
    ]);

    const status = parseShowConfig(showConfig);
    status.pairWhitelist = whitelist.whitelist ?? [];

    const profitSummary: FtProfitSummary = {
      profitClosedCoin: Number(profit.profit_closed_coin ?? 0),
      profitClosedPercent: Number(profit.profit_closed_percent ?? 0),
      profitAllCoin: Number(profit.profit_all_coin ?? 0),
      tradeCount: Number(profit.trade_count ?? 0),
      winRate: profit.winrate != null ? Number(profit.winrate) : null,
    };

    const openTrades: FtOpenTradeCount = {
      current: Number(count.current ?? 0),
      max: Number(count.max ?? 0),
      totalStake: Number(count.total_stake ?? 0),
    };

    return {
      connection,
      status,
      profit: profitSummary,
      openTrades,
      demoBacktest: DEMO_BACKTEST,
    };
  } catch {
    return {
      connection,
      status: null,
      profit: null,
      openTrades: null,
      demoBacktest: DEMO_BACKTEST,
    };
  }
}

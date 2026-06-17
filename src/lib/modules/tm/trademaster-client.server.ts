import { getServerConfig } from "@/lib/config.server";
import {
  metricsFromEquityCurve,
  synthesizeEquityFromReturn,
} from "@/lib/modules/tm/fast-backtest.server";
import type { TmEquityPoint, TmRlMetrics, TmWorkerStatus } from "@/lib/modules/tm/types";

const FETCH_TIMEOUT_MS = 8_000;

function baseUrl(): string | null {
  const { trademasterServiceUrl } = getServerConfig();
  return trademasterServiceUrl?.replace(/\/$/, "") || null;
}

async function tmPost<T>(path: string, body: Record<string, unknown>): Promise<T | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

async function tmGet<T>(path: string): Promise<T | null> {
  const base = baseUrl();
  if (!base) return null;
  try {
    const res = await fetch(`${base}${path}`, {
      method: "GET",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function checkTradeMasterWorker(): Promise<TmWorkerStatus> {
  const configured = Boolean(baseUrl());
  if (!configured) return { configured: false, online: false, latencyMs: null };

  const started = Date.now();
  const res = await tmGet<{ error_code?: number }>("/api/TradeMaster/healthcheck");
  const latencyMs = Date.now() - started;
  return {
    configured: true,
    online: res?.error_code === 0,
    latencyMs: res ? latencyMs : null,
  };
}

export type TmTrainStartResult = {
  sessionId: string;
  error?: string;
};

export async function startTradeMasterTrain(input: {
  task: string;
  dataset: string;
  agent: string;
}): Promise<TmTrainStartResult | null> {
  const json = await tmPost<{ session_id?: string; error_code?: number; info?: string }>(
    "/api/TradeMaster/train",
    {
      task_name: input.task,
      dataset_name: `${input.task}:${input.dataset}`,
      agent_name: `${input.task}:${input.agent}`,
      optimizer_name: "adam",
      loss_name: "mse",
    },
  );
  if (!json?.session_id) return null;
  if (json.error_code && json.error_code !== 0) {
    return { sessionId: "", error: json.info ?? "train_start_failed" };
  }
  return { sessionId: json.session_id };
}

export type TmTrainPollResult = {
  trainEnd: boolean;
  progressPct: number;
  message: string;
};

export async function pollTradeMasterTrain(sessionId: string): Promise<TmTrainPollResult | null> {
  const json = await tmPost<{ train_end?: boolean; info?: string }>("/api/TradeMaster/train_status", {
    session_id: sessionId,
  });
  if (!json) return null;
  const info = json.info ?? "";
  const progressPct = json.train_end ? 50 : estimateProgress(info, 15, 48);
  return {
    trainEnd: Boolean(json.train_end),
    progressPct,
    message: json.train_end ? "Training complete · starting backtest" : truncateLog(info),
  };
}

export async function startTradeMasterTest(sessionId: string): Promise<boolean> {
  const json = await tmPost<{ error_code?: number }>("/api/TradeMaster/test", {
    session_id: sessionId,
  });
  return json?.error_code === 0;
}

export type TmTestPollResult = {
  testEnd: boolean;
  progressPct: number;
  message: string;
  metrics: TmRlMetrics | null;
  equityCurve: TmEquityPoint[];
};

function parseMetricsFromLog(info: string): Partial<TmRlMetrics> {
  const sharpe =
    matchNumber(info, /sharpe[^0-9.-]*([-\d.]+)/i) ??
    matchNumber(info, /SR[^0-9.-]*([-\d.]+)/i);
  const totalReturnPct =
    matchNumber(info, /total return[^0-9.-]*([-\d.]+)/i) ??
    (matchNumber(info, /\bTR[^0-9.-]*([-\d.]+)/i) ?? null);
  const maxDrawdownPct =
    matchNumber(info, /max drawdown[^0-9.-]*([-\d.]+)/i) ??
    matchNumber(info, /\bMDD[^0-9.-]*([-\d.]+)/i);

  return {
    sharpe: sharpe ?? undefined,
    totalReturnPct: totalReturnPct != null ? totalReturnPct * (totalReturnPct <= 1 ? 100 : 1) : undefined,
    maxDrawdownPct: maxDrawdownPct != null ? maxDrawdownPct * (maxDrawdownPct <= 1 ? 100 : 1) : undefined,
  };
}

function matchNumber(text: string, pattern: RegExp): number | null {
  const m = text.match(pattern);
  if (!m?.[1]) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

export async function pollTradeMasterTest(
  sessionId: string,
  tickers: string[],
): Promise<TmTestPollResult | null> {
  const json = await tmPost<{ test_end?: boolean; info?: string }>("/api/TradeMaster/test_status", {
    session_id: sessionId,
  });
  if (!json) return null;
  const info = json.info ?? "";
  const parsed = parseMetricsFromLog(info);
  const totalReturnPct = parsed.totalReturnPct ?? 0;
  const equityCurve =
    totalReturnPct !== 0 ? synthesizeEquityFromReturn(totalReturnPct) : [];
  const metrics: TmRlMetrics | null = json.test_end
    ? {
        sharpe: parsed.sharpe ?? 0,
        totalReturnPct,
        maxDrawdownPct: parsed.maxDrawdownPct ?? 0,
        winRatePct: 0,
        trades: tickers.length,
      }
    : null;

  if (json.test_end && metrics && equityCurve.length > 0 && metrics.sharpe === 0) {
    Object.assign(metrics, metricsFromEquityCurve(equityCurve, tickers.length));
  }

  return {
    testEnd: Boolean(json.test_end),
    progressPct: json.test_end ? 100 : estimateProgress(info, 55, 95),
    message: json.test_end ? "Backtest complete" : truncateLog(info),
    metrics,
    equityCurve,
  };
}

function estimateProgress(log: string, min: number, max: number): number {
  if (!log.trim()) return min;
  if (log.includes("epoch")) {
    const epochs = [...log.matchAll(/epoch[^0-9]*(\d+)/gi)].map((m) => Number(m[1]));
    const last = epochs.at(-1) ?? 0;
    return Math.min(max, min + Math.round(last * 3));
  }
  return Math.min(max, min + 10);
}

function truncateLog(log: string, maxLen = 120): string {
  const line = log.split("\n").find((l) => l.trim().length > 0) ?? "Processing…";
  return line.length > maxLen ? `${line.slice(0, maxLen)}…` : line;
}

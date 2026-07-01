import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import { runQuickBacktest } from "@/lib/modules/tm/fast-backtest.server";
import {
  checkTradeMasterWorker,
  pollTradeMasterTest,
  pollTradeMasterTrain,
  startTradeMasterTest,
  startTradeMasterTrain,
} from "@/lib/modules/tm/trademaster-client.server";
import type {
  TmEquityPoint,
  TmLabPresets,
  TmRlJob,
  TmRlMetrics,
  TmRunMode,
  TmWorkerStatus,
} from "@/lib/modules/tm/types";

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "005930", "000660"];

const EMPTY_METRICS: TmRlMetrics = {
  sharpe: 0,
  totalReturnPct: 0,
  maxDrawdownPct: 0,
  winRatePct: 0,
  trades: 0,
};

function mapJob(row: Record<string, unknown>): TmRlJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as TmRlJob["mode"],
    runMode: (row.run_mode as TmRunMode) ?? "quick",
    task: row.task as string,
    dataset: row.dataset as string,
    agent: row.agent as string,
    tickers: (row.tickers as string[]) ?? [],
    status: row.status as TmRlJob["status"],
    source: row.source as TmRlJob["source"],
    phase: (row.phase as TmRlJob["phase"]) ?? "done",
    progressPct: (row.progress_pct as number) ?? 100,
    progressMessage: (row.progress_message as string) ?? null,
    trademasterSessionId: (row.trademaster_session_id as string) ?? null,
    metrics: (row.metrics as TmRlMetrics) ?? EMPTY_METRICS,
    equityCurve: (row.equity_curve as TmEquityPoint[]) ?? [],
    chartNote: (row.chart_note as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
  };
}

async function updateJob(jobId: string, patch: Record<string, unknown>): Promise<TmRlJob | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("tm_rl_jobs")
    .update(patch)
    .eq("id", jobId)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return mapJob(data as Record<string, unknown>);
}

function completeQuickJob(
  tickers: string[],
  runMode: TmRunMode,
  worker: TmWorkerStatus,
): {
  status: TmRlJob["status"];
  source: TmRlJob["source"];
  metrics: TmRlMetrics;
  equityCurve: TmEquityPoint[];
  chartNote: string;
} {
  const sim = runQuickBacktest(tickers);
  const degraded = runMode === "full" && worker.configured && !worker.online;
  return {
    status: degraded ? "degraded" : "completed",
    source: "fallback",
    metrics: sim.metrics,
    equityCurve: sim.equityCurve,
    chartNote: degraded
      ? `${sim.chartNote} · Worker offline — showing instant estimate`
      : sim.chartNote,
  };
}

export async function getWorkerStatus(): Promise<TmWorkerStatus> {
  return checkTradeMasterWorker();
}

export async function createRlJob(input: {
  userId: string;
  mode: TmRlJob["mode"];
  runMode?: TmRunMode;
  task: string;
  dataset: string;
  agent: string;
  tickers?: string[];
}): Promise<TmRlJob> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const runMode = input.runMode ?? "quick";
  const tickers = (input.tickers?.length ? input.tickers : DEFAULT_TICKERS).slice(0, 10);
  const worker = await getWorkerStatus();

  const { data: inserted, error } = await admin
    .from("tm_rl_jobs")
    .insert({
      user_id: input.userId,
      mode: input.mode,
      run_mode: runMode,
      task: input.task,
      dataset: input.dataset,
      agent: input.agent,
      tickers,
      status: "running",
      phase: runMode === "full" && worker.online ? "idle" : "done",
      progress_pct: runMode === "full" && worker.online ? 5 : 90,
      progress_message: runMode === "full" && worker.online ? "Connecting to TradeMaster worker…" : "Running quick scan…",
      metrics: EMPTY_METRICS,
      equity_curve: [],
      source: "fallback",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  const jobId = (inserted as Record<string, unknown>).id as string;

  if (runMode === "quick" || !worker.online) {
    const result = completeQuickJob(tickers, runMode, worker);
    return (
      (await updateJob(jobId, {
        status: result.status,
        source: result.source,
        phase: "done",
        progress_pct: 100,
        progress_message: null,
        metrics: result.metrics,
        equity_curve: result.equityCurve,
        chart_note: result.chartNote,
        completed_at: new Date().toISOString(),
      })) ?? mapJob(inserted as Record<string, unknown>)
    );
  }

  const train = await startTradeMasterTrain({
    task: input.task,
    dataset: input.dataset,
    agent: input.agent,
  });

  if (!train?.sessionId) {
    const result = completeQuickJob(tickers, runMode, worker);
    return (
      (await updateJob(jobId, {
        status: "degraded",
        source: "fallback",
        phase: "done",
        progress_pct: 100,
        progress_message: null,
        metrics: result.metrics,
        equity_curve: result.equityCurve,
        chart_note: `${result.chartNote} · Train start failed`,
        error_message: train?.error ?? "worker_train_failed",
        completed_at: new Date().toISOString(),
      })) ?? mapJob(inserted as Record<string, unknown>)
    );
  }

  return (
    (await updateJob(jobId, {
      trademaster_session_id: train.sessionId,
      phase: "train",
      progress_pct: 15,
      progress_message: "Training RL agent on worker…",
      source: "trademaster",
    })) ?? mapJob(inserted as Record<string, unknown>)
  );
}

/** Advance one step of an async TradeMaster job (call from client poll). */
export async function advanceRlJob(userId: string, jobId: string): Promise<TmRlJob | null> {
  const job = await getRlJob(userId, jobId);
  if (!job || job.status !== "running") return job;

  const sessionId = job.trademasterSessionId;
  if (!sessionId) {
    return updateJob(jobId, {
      status: "failed",
      phase: "done",
      progress_pct: 100,
      error_message: "missing_session",
      completed_at: new Date().toISOString(),
    });
  }

  if (job.phase === "train") {
    const train = await pollTradeMasterTrain(sessionId);
    if (!train) {
      return updateJob(jobId, {
        progress_message: "Waiting for worker response…",
      });
    }
    if (!train.trainEnd) {
      return updateJob(jobId, {
        progress_pct: train.progressPct,
        progress_message: train.message,
      });
    }
    const testStarted = await startTradeMasterTest(sessionId);
    if (!testStarted) {
      const fallback = runQuickBacktest(job.tickers);
      return updateJob(jobId, {
        status: "degraded",
        phase: "done",
        progress_pct: 100,
        progress_message: null,
        metrics: fallback.metrics,
        equity_curve: fallback.equityCurve,
        chart_note: `${fallback.chartNote} · Test start failed on worker`,
        error_message: "worker_test_failed",
        completed_at: new Date().toISOString(),
      });
    }
    return updateJob(jobId, {
      phase: "test",
      progress_pct: 55,
      progress_message: "Running backtest on worker…",
    });
  }

  if (job.phase === "test") {
    const test = await pollTradeMasterTest(sessionId, job.tickers);
    if (!test) {
      return updateJob(jobId, { progress_message: "Waiting for backtest…" });
    }
    if (!test.testEnd) {
      return updateJob(jobId, {
        progress_pct: test.progressPct,
        progress_message: test.message,
      });
    }
    const metrics = test.metrics ?? EMPTY_METRICS;
    const equityCurve =
      test.equityCurve.length > 0 ? test.equityCurve : runQuickBacktest(job.tickers).equityCurve;
    return updateJob(jobId, {
      status: "completed",
      phase: "done",
      progress_pct: 100,
      progress_message: null,
      metrics,
      equity_curve: equityCurve,
      chart_note: "TradeMaster worker · train → test pipeline complete",
      completed_at: new Date().toISOString(),
    });
  }

  return job;
}

export async function getRlJob(userId: string, jobId: string): Promise<TmRlJob | null> {
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin
    .from("tm_rl_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapJob(data as Record<string, unknown>);
}

export async function listRlJobs(userId: string, limit = 10): Promise<TmRlJob[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("tm_rl_jobs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => mapJob(row as Record<string, unknown>));
}

export async function listRlPresets(): Promise<TmLabPresets> {
  const worker = await getWorkerStatus();
  return {
    tasks: [
      { id: "portfolio_management", label: "Portfolio Management" },
      { id: "algorithmic_trading", label: "Algorithmic Trading" },
    ],
    datasets: [
      { id: "dj30", label: "DJ30" },
      { id: "exchange", label: "Exchange" },
      { id: "BTC", label: "BTC" },
    ],
    agents: [
      { id: "ppo", label: "PPO" },
      { id: "eiie", label: "EIIE" },
      { id: "sarl", label: "SARL" },
      { id: "deepscalper", label: "DeepScalper" },
    ],
    worker,
  };
}

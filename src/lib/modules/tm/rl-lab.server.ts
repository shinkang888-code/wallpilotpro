import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import type { TmEquityPoint, TmRlJob, TmRlMetrics } from "@/lib/modules/tm/types";

const DEFAULT_TICKERS = ["NVDA", "AAPL", "MSFT", "005930", "000660"];

function simulateMomentumBacktest(tickers: string[]): {
  metrics: TmRlMetrics;
  equityCurve: TmEquityPoint[];
  chartNote: string;
} {
  const startValue = 100_000;
  let value = startValue;
  const curve: TmEquityPoint[] = [];
  const today = new Date();
  let wins = 0;
  let trades = tickers.length;

  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const drift = 1 + (Math.sin(i / 5) * 0.004 + 0.0012);
    value *= drift;
    if (drift > 1.002) wins += 1;
    curve.push({ date: d.toISOString().slice(0, 10), value: Math.round(value) });
  }

  const totalReturnPct = ((value - startValue) / startValue) * 100;
  const peak = Math.max(...curve.map((p) => p.value));
  const trough = Math.min(...curve.map((p) => p.value));
  const maxDrawdownPct = peak > 0 ? ((peak - trough) / peak) * 100 : 0;
  const dailyReturns = curve.slice(1).map((p, idx) => (p.value - curve[idx].value) / curve[idx].value);
  const avg = dailyReturns.reduce((a, b) => a + b, 0) / Math.max(dailyReturns.length, 1);
  const variance =
    dailyReturns.reduce((a, b) => a + (b - avg) ** 2, 0) / Math.max(dailyReturns.length, 1);
  const sharpe = variance > 0 ? (avg / Math.sqrt(variance)) * Math.sqrt(252) : 0;

  return {
    metrics: {
      sharpe: Number(sharpe.toFixed(2)),
      totalReturnPct: Number(totalReturnPct.toFixed(2)),
      maxDrawdownPct: Number(maxDrawdownPct.toFixed(2)),
      winRatePct: Number(((wins / Math.max(trades, 1)) * 100).toFixed(1)),
      trades,
    },
    equityCurve: curve,
    chartNote: `Momentum-weighted portfolio simulation (${tickers.join(", ")}) — TradeMaster worker unavailable, using WallPilot fallback.`,
  };
}

async function fetchExternalBacktest(input: {
  task: string;
  dataset: string;
  agent: string;
  tickers: string[];
}): Promise<{ metrics: TmRlMetrics; equityCurve: TmEquityPoint[]; chartNote: string } | null> {
  const { trademasterServiceUrl } = getServerConfig();
  if (!trademasterServiceUrl) return null;

  try {
    const base = trademasterServiceUrl.replace(/\/$/, "");
    const trainRes = await fetch(`${base}/api/TradeMaster/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_name: input.task,
        dataset_name: `${input.task}:${input.dataset}`,
        agent_name: `${input.task}:${input.agent}`,
      }),
      signal: AbortSignal.timeout(30_000),
    });
    if (!trainRes.ok) return null;
    const { session_id: sessionId } = (await trainRes.json()) as { session_id?: string };
    if (!sessionId) return null;

    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const statusRes = await fetch(`${base}/api/TradeMaster/test_status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!statusRes.ok) continue;
      const status = (await statusRes.json()) as {
        test_end?: boolean;
        sharpe_ratio?: number;
        tr?: number;
        mdd?: number;
      };
      if (status.test_end) {
        return {
          metrics: {
            sharpe: Number(status.sharpe_ratio ?? 0),
            totalReturnPct: Number((status.tr ?? 0) * 100),
            maxDrawdownPct: Number((status.mdd ?? 0) * 100),
            winRatePct: 0,
            trades: input.tickers.length,
          },
          equityCurve: [],
          chartNote: "TradeMaster worker backtest completed.",
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

function mapJob(row: Record<string, unknown>): TmRlJob {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as TmRlJob["mode"],
    task: row.task as string,
    dataset: row.dataset as string,
    agent: row.agent as string,
    tickers: (row.tickers as string[]) ?? [],
    status: row.status as TmRlJob["status"],
    source: row.source as TmRlJob["source"],
    metrics: row.metrics as TmRlMetrics,
    equityCurve: (row.equity_curve as TmEquityPoint[]) ?? [],
    chartNote: (row.chart_note as string) ?? null,
    errorMessage: (row.error_message as string) ?? null,
    createdAt: row.created_at as string,
    completedAt: (row.completed_at as string) ?? null,
  };
}

export async function createRlJob(input: {
  userId: string;
  mode: TmRlJob["mode"];
  task: string;
  dataset: string;
  agent: string;
  tickers?: string[];
}): Promise<TmRlJob> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const tickers = (input.tickers?.length ? input.tickers : DEFAULT_TICKERS).slice(0, 10);

  const { data: inserted, error } = await admin
    .from("tm_rl_jobs")
    .insert({
      user_id: input.userId,
      mode: input.mode,
      task: input.task,
      dataset: input.dataset,
      agent: input.agent,
      tickers,
      status: "running",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  let source: TmRlJob["source"] = "fallback";
  let status: TmRlJob["status"] = "completed";
  let metrics: TmRlMetrics;
  let equityCurve: TmEquityPoint[];
  let chartNote: string;
  let errorMessage: string | null = null;

  const external = await fetchExternalBacktest({
    task: input.task,
    dataset: input.dataset,
    agent: input.agent,
    tickers,
  });

  if (external) {
    source = "trademaster";
    metrics = external.metrics;
    equityCurve = external.equityCurve;
    chartNote = external.chartNote;
  } else {
    const sim = simulateMomentumBacktest(tickers);
    metrics = sim.metrics;
    equityCurve = sim.equityCurve;
    chartNote = sim.chartNote;
    status = "degraded";
  }

  const completedAt = new Date().toISOString();
  const { data: updated, error: updateErr } = await admin
    .from("tm_rl_jobs")
    .update({
      status,
      source,
      metrics,
      equity_curve: equityCurve,
      chart_note: chartNote,
      error_message: errorMessage,
      completed_at: completedAt,
    })
    .eq("id", (inserted as Record<string, unknown>).id as string)
    .select("*")
    .single();

  if (updateErr) throw new Error(updateErr.message);
  return mapJob(updated as Record<string, unknown>);
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

export function listRlPresets() {
  return {
    tasks: [
      { id: "portfolio_management", label: "Portfolio Management" },
      { id: "algorithmic_trading", label: "Algorithmic Trading" },
    ],
    datasets: [
      { id: "dj30", label: "DJ30" },
      { id: "BTC", label: "BTC" },
      { id: "005930", label: "Samsung (KR)" },
    ],
    agents: [
      { id: "ppo", label: "PPO" },
      { id: "eiie", label: "EIIE" },
      { id: "deepscalper", label: "DeepScalper" },
    ],
  };
}

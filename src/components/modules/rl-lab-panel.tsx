import { useEffect, useState } from "react";
import { FlaskConical, Loader2, Play } from "lucide-react";

import { fetchRlJobHistory, getRlLabPresets, runRlBacktest } from "@/lib/api/tm.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import type { TmRlJob } from "@/lib/modules/tm/types";
import { cn } from "@/lib/utils";

export function RlLabPanel() {
  const { t } = useI18n();
  const { accessToken, entitlements, enforced, isActive } = useAuth();
  const [presets, setPresets] = useState<{
    tasks: { id: string; label: string }[];
    datasets: { id: string; label: string }[];
    agents: { id: string; label: string }[];
  } | null>(null);
  const [task, setTask] = useState("portfolio_management");
  const [dataset, setDataset] = useState("dj30");
  const [agent, setAgent] = useState("ppo");
  const [tickers, setTickers] = useState("NVDA,AAPL,MSFT");
  const [job, setJob] = useState<TmRlJob | null>(null);
  const [history, setHistory] = useState<TmRlJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canRun = !enforced || (isActive && Boolean(entitlements?.rl_lab));

  useEffect(() => {
    void getRlLabPresets({ data: {} }).then(setPresets);
  }, []);

  useEffect(() => {
    if (!canRun || !accessToken) return;
    void fetchRlJobHistory({ data: { accessToken, limit: 5 } }).then(setHistory);
  }, [accessToken, canRun]);

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    try {
      const result = await runRlBacktest({
        data: {
          accessToken,
          task,
          dataset,
          agent,
          tickers: tickers.split(",").map((s) => s.trim()).filter(Boolean),
          mode: "backtest",
        },
      });
      setJob(result);
      setHistory((prev) => [result, ...prev.filter((j) => j.id !== result.id)].slice(0, 5));
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "rl_failed", t));
    } finally {
      setLoading(false);
    }
  };

  const maxEquity = job?.equityCurve.length
    ? Math.max(...job.equityCurve.map((p) => p.value))
    : 0;
  const minEquity = job?.equityCurve.length
    ? Math.min(...job.equityCurve.map((p) => p.value))
    : 0;

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <FlaskConical className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">tm.* · TradeMaster</span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("tm_lab_intro")}</p>

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("tm_task")}</span>
            <select
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2"
            >
              {(presets?.tasks ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("tm_dataset")}</span>
            <select
              value={dataset}
              onChange={(e) => setDataset(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2"
            >
              {(presets?.datasets ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("tm_agent")}</span>
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2"
            >
              {(presets?.agents ?? []).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("tm_tickers")}</span>
          <input
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline px-3 py-2"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading || !canRun}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {t("tm_run_backtest")}
        </button>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>

      {job ? (
        <section className="rounded-2xl border border-hairline bg-white p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                job.source === "trademaster" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
              )}
            >
              {job.source}
            </span>
            <span className="text-xs text-muted-foreground">{job.status}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Sharpe", value: job.metrics.sharpe },
              { label: "Return %", value: job.metrics.totalReturnPct },
              { label: "MDD %", value: job.metrics.maxDrawdownPct },
              { label: "Win %", value: job.metrics.winRatePct },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{m.label}</p>
                <p className="text-lg font-bold">{m.value}</p>
              </div>
            ))}
          </div>

          {job.chartNote ? <p className="text-xs text-muted-foreground">{job.chartNote}</p> : null}

          {job.equityCurve.length > 0 ? (
            <div className="flex h-32 items-end gap-0.5 rounded-xl border border-hairline bg-muted/20 p-2">
              {job.equityCurve.map((point) => {
                const range = maxEquity - minEquity || 1;
                const h = ((point.value - minEquity) / range) * 100;
                return (
                  <div
                    key={point.date}
                    title={`${point.date}: ${point.value}`}
                    className="flex-1 rounded-t bg-primary/70"
                    style={{ height: `${Math.max(h, 4)}%` }}
                  />
                );
              })}
            </div>
          ) : null}
        </section>
      ) : null}

      {history.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold">{t("tm_history")}</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg border border-hairline px-3 py-2">
                {h.task}/{h.dataset}/{h.agent} · {h.metrics.totalReturnPct}% · {h.source}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { FlaskConical, Loader2, Play, Zap, Cpu } from "lucide-react";

import { RlLabDemoShell } from "@/components/modules/rl-lab-demo-shell";
import { RlLabJobCard } from "@/components/modules/rl-lab-job-card";
import {
  fetchRlJobHistory,
  getRlLabPresets,
  pollRlJob,
  runRlBacktest,
} from "@/lib/api/tm.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import type { TmLabPresets, TmRlJob, TmRunMode } from "@/lib/modules/tm/types";
import { useAuth } from "@/lib/use-auth";
import { clientHasEntitlement } from "@/lib/membership/trial-demo";
import { cn } from "@/lib/utils";

const POLL_MS = 1_200;

export function RlLabPanel() {
  const { t } = useI18n();
  const { accessToken, entitlements, enforced, isActive } = useAuth();
  const [presets, setPresets] = useState<TmLabPresets | null>(null);
  const [task, setTask] = useState("portfolio_management");
  const [dataset, setDataset] = useState("dj30");
  const [agent, setAgent] = useState("ppo");
  const [tickers, setTickers] = useState("NVDA,AAPL,MSFT");
  const [runMode, setRunMode] = useState<TmRunMode>("quick");
  const [job, setJob] = useState<TmRlJob | null>(null);
  const [history, setHistory] = useState<TmRlJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"demo" | "live">("demo");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const canRun = clientHasEntitlement(enforced, entitlements, "rl_lab");
  const workerOnline = presets?.worker.online ?? false;

  useEffect(() => {
    void getRlLabPresets().then(setPresets);
  }, []);

  useEffect(() => {
    if (!canRun || !accessToken) return;
    void fetchRlJobHistory({ data: { accessToken, limit: 8 } }).then(setHistory);
  }, [accessToken, canRun]);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startPoll = useCallback(
    (jobId: string) => {
      stopPoll();
      if (!accessToken) return;
      pollRef.current = setInterval(() => {
        void pollRlJob({ data: { accessToken, jobId } }).then((next) => {
          if (!next) return;
          setJob(next);
          if (next.status !== "running") {
            stopPoll();
            setHistory((prev) => [next, ...prev.filter((j) => j.id !== next.id)].slice(0, 8));
          }
        });
      }, POLL_MS);
    },
    [accessToken, stopPoll],
  );

  useEffect(() => () => stopPoll(), [stopPoll]);

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    stopPoll();
    try {
      const effectiveMode: TmRunMode = runMode === "full" && !workerOnline ? "quick" : runMode;
      const result = await runRlBacktest({
        data: {
          accessToken,
          task,
          dataset,
          agent,
          tickers: tickers.split(",").map((s) => s.trim()).filter(Boolean),
          mode: "backtest",
          runMode: effectiveMode,
        },
      });
      setJob(result);
      if (result.status === "running") {
        startPoll(result.id);
      } else {
        setHistory((prev) => [result, ...prev.filter((j) => j.id !== result.id)].slice(0, 8));
      }
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "rl_failed", t));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setViewMode("demo")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-semibold",
            viewMode === "demo" ? "border-sky-500 bg-sky-50 text-sky-800" : "border-hairline text-muted-foreground",
          )}
        >
          {t("tm_mode_demo")}
        </button>
        <button
          type="button"
          onClick={() => setViewMode("live")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-xs font-semibold",
            viewMode === "live" ? "border-primary bg-primary/10 text-primary" : "border-hairline text-muted-foreground",
          )}
        >
          {t("tm_mode_live")}
        </button>
      </div>

      {viewMode === "demo" ? <RlLabDemoShell /> : null}

      {viewMode === "live" ? (
      <>
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary">
            <FlaskConical className="h-5 w-5" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em]">tm.* · TradeMaster</span>
          </div>
          <WorkerBadge
            configured={presets?.worker.configured ?? false}
            online={workerOnline}
            latencyMs={presets?.worker.latencyMs ?? null}
          />
        </div>

        <p className="mb-4 text-sm text-muted-foreground">{t("tm_lab_intro")}</p>

        <div className="mb-4 grid grid-cols-2 gap-2 sm:max-w-md">
          <ModeButton
            active={runMode === "quick"}
            icon={<Zap className="h-4 w-4" />}
            label={t("tm_mode_quick")}
            hint={t("tm_mode_quick_hint")}
            onClick={() => setRunMode("quick")}
          />
          <ModeButton
            active={runMode === "full"}
            icon={<Cpu className="h-4 w-4" />}
            label={t("tm_mode_full")}
            hint={workerOnline ? t("tm_mode_full_hint") : t("tm_mode_full_offline")}
            disabled={!workerOnline}
            onClick={() => workerOnline && setRunMode("full")}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <SelectField label={t("tm_task")} value={task} onChange={setTask}>
            {(presets?.tasks ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <SelectField label={t("tm_dataset")} value={dataset} onChange={setDataset}>
            {(presets?.datasets ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <SelectField label={t("tm_agent")} value={agent} onChange={setAgent}>
            {(presets?.agents ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
        </div>

        <label className="mt-4 block text-sm">
          <span className="text-[10px] font-bold uppercase text-muted-foreground">{t("tm_tickers")}</span>
          <input
            value={tickers}
            onChange={(e) => setTickers(e.target.value)}
            className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2 text-sm"
          />
        </label>

        <button
          type="button"
          onClick={() => void handleRun()}
          disabled={loading || !canRun || (job?.status === "running")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {loading || job?.status === "running" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {runMode === "quick" ? t("tm_run_quick") : t("tm_run_backtest")}
        </button>

        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>

      {job ? <RlLabJobCard job={job} /> : null}

      {history.length > 0 ? (
        <section>
          <h3 className="mb-3 text-sm font-semibold">{t("tm_history")}</h3>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  onClick={() => setJob(h)}
                  className="w-full rounded-xl border border-hairline bg-white px-4 py-3 text-left text-sm transition-colors hover:bg-surface"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-foreground">
                      {h.task}/{h.agent} · {h.metrics.totalReturnPct}%
                    </span>
                    <span className="text-[10px] uppercase text-muted-foreground">
                      {h.source} · {h.runMode}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </>
      ) : null}
    </div>
  );
}

function WorkerBadge({
  configured,
  online,
  latencyMs,
}: {
  configured: boolean;
  online: boolean;
  latencyMs: number | null;
}) {
  const { t } = useI18n();
  if (!configured) {
    return (
      <span className="rounded-full bg-muted px-3 py-1 text-[10px] font-semibold text-muted-foreground">
        {t("tm_worker_local")}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[10px] font-semibold",
        online ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
      )}
    >
      {online
        ? `${t("tm_worker_online")}${latencyMs != null ? ` · ${latencyMs}ms` : ""}`
        : t("tm_worker_offline")}
    </span>
  );
}

function ModeButton({
  active,
  icon,
  label,
  hint,
  disabled,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  hint: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "rounded-xl border p-3 text-left transition-all",
        active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-hairline bg-white hover:bg-surface",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <div className="flex items-center gap-2 font-semibold text-sm">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{hint}</p>
    </button>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="text-sm">
      <span className="text-[10px] font-bold uppercase text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-hairline bg-white px-3 py-2"
      >
        {children}
      </select>
    </label>
  );
}

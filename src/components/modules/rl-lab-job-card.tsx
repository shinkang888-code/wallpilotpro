import { Loader2 } from "lucide-react";

import { RlLabEquityChart } from "@/components/modules/rl-lab-equity-chart";
import { useI18n } from "@/lib/i18n";
import type { TmRlJob } from "@/lib/modules/tm/types";
import { cn } from "@/lib/utils";

export function RlLabJobCard({ job, compact }: { job: TmRlJob; compact?: boolean }) {
  const { t } = useI18n();
  const running = job.status === "running";

  return (
    <section
      className={cn(
        "rounded-2xl border border-hairline bg-white p-5 sm:p-6 space-y-4",
        running && "ring-1 ring-primary/20",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <SourceBadge source={job.source} />
        <StatusBadge status={job.status} />
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-muted-foreground">
          {job.runMode === "quick" ? t("tm_mode_quick") : t("tm_mode_full")}
        </span>
        {!compact && (
          <span className="text-[10px] text-muted-foreground">
            {job.task}/{job.dataset}/{job.agent}
          </span>
        )}
      </div>

      {running && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              {job.progressMessage ?? t("tm_running")}
            </span>
            <span className="font-mono font-semibold text-primary">{job.progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
              style={{ width: `${job.progressPct}%` }}
            />
          </div>
        </div>
      )}

      {!running && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Sharpe", value: job.metrics.sharpe, tone: job.metrics.sharpe >= 1 ? "good" : "neutral" },
              { label: t("tm_return"), value: `${job.metrics.totalReturnPct}%`, tone: job.metrics.totalReturnPct >= 0 ? "good" : "bad" },
              { label: "MDD", value: `${job.metrics.maxDrawdownPct}%`, tone: "neutral" },
              { label: t("tm_win_rate"), value: `${job.metrics.winRatePct}%`, tone: "neutral" },
            ].map((m) => (
              <div key={m.label} className="rounded-xl bg-muted/40 p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{m.label}</p>
                <p
                  className={cn(
                    "mt-1 font-display text-xl font-bold tabular-nums",
                    m.tone === "good" && "text-positive",
                    m.tone === "bad" && "text-destructive",
                  )}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>

          {job.chartNote ? <p className="text-xs text-muted-foreground">{job.chartNote}</p> : null}

          {job.equityCurve.length > 0 && <RlLabEquityChart curve={job.equityCurve} />}
        </>
      )}

      {job.errorMessage && !running ? (
        <p className="text-xs text-amber-700">{job.errorMessage}</p>
      ) : null}
    </section>
  );
}

function SourceBadge({ source }: { source: TmRlJob["source"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        source === "trademaster" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800",
      )}
    >
      {source}
    </span>
  );
}

function StatusBadge({ status }: { status: TmRlJob["status"] }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
        status === "completed" && "bg-emerald-50 text-positive",
        status === "running" && "bg-primary/10 text-primary",
        status === "degraded" && "bg-amber-50 text-amber-800",
        status === "failed" && "bg-red-50 text-destructive",
      )}
    >
      {status}
    </span>
  );
}

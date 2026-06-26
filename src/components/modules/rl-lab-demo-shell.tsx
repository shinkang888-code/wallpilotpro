import { useEffect, useState } from "react";
import { Activity, CheckCircle2, Cpu, FlaskConical, LineChart, Loader2, Zap } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DEMO_EQUITY = [100, 100.4, 101.2, 100.8, 102.1, 103.5, 104.2, 105.8, 106.1, 107.4, 108.9, 109.2];

export function RlLabDemoShell() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<"train" | "test" | "done">("train");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          return 100;
        }
        const next = p + 4;
        if (next >= 45 && phase === "train") setPhase("test");
        if (next >= 100) setPhase("done");
        return next;
      });
    }, 120);
    return () => clearInterval(timer);
  }, [phase]);

  const maxEq = Math.max(...DEMO_EQUITY);
  const minEq = Math.min(...DEMO_EQUITY);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/60 px-4 py-3">
        <FlaskConical className="h-5 w-5 text-sky-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-sky-950">{t("tm_demo_banner_title")}</p>
          <p className="text-xs text-sky-900/80">{t("tm_demo_banner_body")}</p>
        </div>
        <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
          Demo
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-hairline bg-surface p-4 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <LineChart className="h-4 w-4 text-primary" />
              {t("tm_demo_equity_title")}
            </h3>
            <span className="text-xs text-muted-foreground">PPO · DJ30 · portfolio_management</span>
          </div>
          <div className="flex h-40 items-end gap-1">
            {DEMO_EQUITY.map((v, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-primary/70 transition-all"
                style={{
                  height: `${((v - minEq) / (maxEq - minEq || 1)) * 85 + 15}%`,
                  opacity: progress > i * 8 ? 1 : 0.25,
                }}
              />
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{t("tm_demo_equity_hint")}</p>
        </div>

        <div className="space-y-3">
          <MetricCard icon={Cpu} label={t("tm_demo_metric_sharpe")} value="1.42" />
          <MetricCard icon={Activity} label={t("tm_demo_metric_mdd")} value="-4.8%" />
          <MetricCard icon={Zap} label={t("tm_demo_metric_return")} value="+9.2%" highlight />
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{t("tm_demo_job_title")}</h3>
          {phase === "done" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
        </div>
        <div className="mb-2 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className={cn("h-full rounded-full transition-all", phase === "done" ? "bg-emerald-500" : "bg-primary")}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {phase === "train" && t("tm_demo_phase_train")}
          {phase === "test" && t("tm_demo_phase_test")}
          {phase === "done" && t("tm_demo_phase_done")}
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  highlight,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn("rounded-xl border border-hairline p-3", highlight && "border-emerald-200 bg-emerald-50/50")}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

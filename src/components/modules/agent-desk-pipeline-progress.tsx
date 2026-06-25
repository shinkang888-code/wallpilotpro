import {
  BarChart3,
  Briefcase,
  Loader2,
  Newspaper,
  Scale,
  Shield,
  TrendingUp,
  Users,
} from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type PipelineStepId =
  | "analysts"
  | "research"
  | "trader"
  | "risk"
  | "portfolio";

const STEPS: Array<{
  id: PipelineStepId;
  labelKey: "ta_pipe_analysts" | "ta_pipe_research" | "ta_pipe_trader" | "ta_pipe_risk" | "ta_pipe_pm";
  icon: typeof BarChart3;
  subKey:
    | "ta_pipe_analysts_sub"
    | "ta_pipe_research_sub"
    | "ta_pipe_trader_sub"
    | "ta_pipe_risk_sub"
    | "ta_pipe_pm_sub";
}> = [
  { id: "analysts", labelKey: "ta_pipe_analysts", icon: BarChart3, subKey: "ta_pipe_analysts_sub" },
  { id: "research", labelKey: "ta_pipe_research", icon: Users, subKey: "ta_pipe_research_sub" },
  { id: "trader", labelKey: "ta_pipe_trader", icon: TrendingUp, subKey: "ta_pipe_trader_sub" },
  { id: "risk", labelKey: "ta_pipe_risk", icon: Shield, subKey: "ta_pipe_risk_sub" },
  { id: "portfolio", labelKey: "ta_pipe_pm", icon: Briefcase, subKey: "ta_pipe_pm_sub" },
];

export function AgentDeskPipelineProgress({
  activeStep,
  loading,
}: {
  activeStep: PipelineStepId | null;
  loading: boolean;
}) {
  const { t } = useI18n();
  const activeIndex = activeStep ? STEPS.findIndex((s) => s.id === activeStep) : -1;

  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5">
      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {loading ? t("ta_pipe_running") : t("ta_pipe_title")}
      </p>
      <div className="grid gap-2 sm:grid-cols-5">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const done = activeIndex > i;
          const active = activeIndex === i && loading;
          const pending = activeIndex < i || activeIndex === -1;

          return (
            <div
              key={step.id}
              className={cn(
                "relative rounded-xl border px-3 py-3 transition-colors",
                done && "border-emerald-200 bg-emerald-50/60",
                active && "border-primary/40 bg-primary/5",
                pending && !loading && "border-hairline bg-white",
                pending && loading && activeIndex === -1 && i === 0 && "border-primary/40 bg-primary/5",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Icon className={cn("h-4 w-4", active || done ? "text-primary" : "text-muted-foreground")} />
                {active ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : null}
              </div>
              <p className="text-xs font-semibold">{t(step.labelKey)}</p>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{t(step.subKey)}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AgentDeskPipelineLegend() {
  const { t } = useI18n();

  const items = [
    { icon: BarChart3, label: t("ta_legend_market") },
    { icon: Scale, label: t("ta_legend_fundamentals") },
    { icon: Newspaper, label: t("ta_legend_news") },
    { icon: Users, label: t("ta_legend_sentiment") },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ icon: Icon, label }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] text-muted-foreground"
        >
          <Icon className="h-3 w-3" />
          {label}
        </span>
      ))}
    </div>
  );
}

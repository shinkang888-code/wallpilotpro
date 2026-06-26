import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";

import { AgentDeskPipelineProgress } from "@/components/modules/agent-desk-pipeline-progress";
import { AgentDeskReportView } from "@/components/modules/agent-desk-report-view";
import { RatingBadge } from "@/components/rating-badge";
import { AGENT_DESK_DEMO_REPORT } from "@/lib/modules/ta/agent-desk-demo-data";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AgentDeskDemoShell() {
  const { t } = useI18n();
  const [booting, setBooting] = useState(true);
  const [step, setStep] = useState<"analysts" | "research" | "trader" | "risk" | "portfolio" | null>("analysts");
  const report = AGENT_DESK_DEMO_REPORT;

  useEffect(() => {
    const steps = ["analysts", "research", "trader", "risk", "portfolio"] as const;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= steps.length) {
        setBooting(false);
        setStep(null);
        clearInterval(timer);
        return;
      }
      setStep(steps[i] ?? null);
    }, 900);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 px-4 py-3">
        <Sparkles className="h-5 w-5 text-violet-700" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-violet-950">{t("ta_demo_banner_title")}</p>
          <p className="text-xs text-violet-900/80">{t("ta_demo_banner_body")}</p>
        </div>
        <span className="rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase text-white">
          Demo
        </span>
      </div>

      {booting ? (
        <AgentDeskPipelineProgress activeStep={step} loading={booting} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <Bot className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-bold">{report.name}</h2>
            <RatingBadge rating={report.rating} />
            <span className="text-xs text-muted-foreground">{report.ticker}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                "bg-emerald-100 text-emerald-800",
              )}
            >
              {t("ta_source_sidecar")}
            </span>
          </div>
          <AgentDeskReportView report={report} />
        </>
      )}
    </div>
  );
}

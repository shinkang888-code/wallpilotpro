import {
  BarChart3,
  Briefcase,
  Newspaper,
  Scale,
  Shield,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";

import { DeepAgentReportScroll } from "@/components/deep-agent-report-scroll";
import { RatingBadge } from "@/components/rating-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useI18n } from "@/lib/i18n";
import type { DeepAgentReport } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

function ReportBlock({ title, body, accent }: { title: string; body: string; accent?: string }) {
  return (
    <div className={cn("rounded-xl border border-hairline bg-white p-4", accent)}>
      <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground">{title}</h4>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

function AnalystCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof BarChart3;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-white p-4">
      <div className="mb-2 flex items-center gap-2 text-primary">
        <Icon className="h-4 w-4" />
        <h4 className="text-xs font-semibold">{title}</h4>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{body}</p>
    </div>
  );
}

export function AgentDeskReportView({ report }: { report: DeepAgentReport }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="pipeline" className="w-full">
        <TabsList className="mb-4 flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/30 p-1">
          <TabsTrigger value="pipeline" className="text-xs">
            {t("ta_tab_pipeline")}
          </TabsTrigger>
          <TabsTrigger value="debate" className="text-xs">
            {t("ta_tab_debate")}
          </TabsTrigger>
          <TabsTrigger value="trader" className="text-xs">
            {t("ta_tab_trader")}
          </TabsTrigger>
          <TabsTrigger value="risk" className="text-xs">
            {t("ta_tab_risk")}
          </TabsTrigger>
          <TabsTrigger value="pm" className="text-xs">
            {t("ta_tab_pm")}
          </TabsTrigger>
          <TabsTrigger value="full" className="text-xs">
            {t("ta_tab_full_report")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <AnalystCard icon={BarChart3} title={t("ta_legend_market")} body={report.analysts.market} />
            <AnalystCard icon={Scale} title={t("ta_legend_fundamentals")} body={report.analysts.fundamentals} />
            <AnalystCard icon={Newspaper} title={t("ta_legend_news")} body={report.analysts.news} />
            <AnalystCard icon={Users} title={t("ta_legend_sentiment")} body={report.analysts.sentiment} />
          </div>
        </TabsContent>

        <TabsContent value="debate" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <ReportBlock
              title={t("ta_bull_case")}
              body={report.debate.bullCase}
              accent="border-emerald-200/80 bg-emerald-50/40"
            />
            <ReportBlock
              title={t("ta_bear_case")}
              body={report.debate.bearCase}
              accent="border-red-200/80 bg-red-50/40"
            />
          </div>
          <ReportBlock title={t("ta_research_verdict")} body={report.debate.verdict} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t("ta_debate_rating")}</span>
            <RatingBadge rating={report.debate.rating} />
          </div>
        </TabsContent>

        <TabsContent value="trader" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase",
                report.trader.action === "Buy" && "bg-emerald-100 text-emerald-800",
                report.trader.action === "Hold" && "bg-amber-100 text-amber-900",
                report.trader.action === "Sell" && "bg-red-100 text-red-800",
              )}
            >
              {report.trader.action === "Buy" ? (
                <TrendingUp className="h-3.5 w-3.5" />
              ) : report.trader.action === "Sell" ? (
                <TrendingDown className="h-3.5 w-3.5" />
              ) : null}
              {report.trader.action}
            </span>
          </div>
          <ReportBlock title={t("ta_trader_reasoning")} body={report.trader.reasoning} />
          <div className="grid gap-3 sm:grid-cols-3">
            {report.trader.entryPrice != null ? (
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{t("ta_entry_price")}</p>
                <p className="mt-1 font-mono text-sm font-semibold">{report.trader.entryPrice}</p>
              </div>
            ) : null}
            {report.trader.stopLoss != null ? (
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{t("ta_stop_loss")}</p>
                <p className="mt-1 font-mono text-sm font-semibold">{report.trader.stopLoss}</p>
              </div>
            ) : null}
            {report.trader.positionSizing ? (
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{t("ta_position_size")}</p>
                <p className="mt-1 text-sm font-semibold">{report.trader.positionSizing}</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm font-semibold",
              report.riskGate.approved
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-red-200 bg-red-50 text-red-800",
            )}
          >
            <Shield className="mb-1 inline h-4 w-4" />{" "}
            {report.riskGate.approved ? t("ta_risk_approved") : t("ta_risk_blocked")}: {report.riskGate.reason}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ReportBlock title={t("ta_risk_aggressive")} body={report.riskGate.aggressiveView} />
            <ReportBlock title={t("ta_risk_conservative")} body={report.riskGate.conservativeView} />
          </div>
        </TabsContent>

        <TabsContent value="pm" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Briefcase className="h-5 w-5 text-primary" />
            <RatingBadge rating={report.portfolio.rating} />
          </div>
          <ReportBlock title={t("ta_pm_summary")} body={report.portfolio.executiveSummary} />
          <ReportBlock title={t("ta_pm_thesis")} body={report.portfolio.investmentThesis} />
          <div className="grid gap-3 sm:grid-cols-2">
            {report.portfolio.priceTarget != null ? (
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{t("ta_price_target")}</p>
                <p className="mt-1 font-mono text-sm font-semibold">{report.portfolio.priceTarget}</p>
              </div>
            ) : null}
            {report.portfolio.timeHorizon ? (
              <div className="rounded-xl border border-hairline bg-white p-3">
                <p className="text-[10px] uppercase text-muted-foreground">{t("ta_time_horizon")}</p>
                <p className="mt-1 text-sm font-semibold">{report.portfolio.timeHorizon}</p>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="full">
          <DeepAgentReportScroll markdownEn={report.markdown} markdownKo={report.markdownKo} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

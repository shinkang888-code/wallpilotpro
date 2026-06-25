import { useEffect, useRef, useState } from "react";
import { Bot, Calendar, Loader2, Settings2 } from "lucide-react";

import {
  AgentDeskPipelineLegend,
  AgentDeskPipelineProgress,
  type PipelineStepId,
} from "@/components/modules/agent-desk-pipeline-progress";
import { AgentDeskReportView } from "@/components/modules/agent-desk-report-view";
import { AgentDeskSetupPanel } from "@/components/modules/agent-desk-setup-panel";
import { RatingBadge } from "@/components/rating-badge";
import { StockSearchCombobox } from "@/components/stock-search-combobox";
import { WallStreetPriceChart } from "@/components/wall-street-price-chart";
import { runAgentDeskAnalysis } from "@/lib/api/ta.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import type { TradingAgentsEngine } from "@/lib/modules/ta/types";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import type { StockSearchResult } from "@/lib/types/search";
import type { DeepAgentReport } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

const QUICK_PICKS: StockSearchResult[] = [
  { ticker: "NVDA", name: "NVIDIA", market: "US", yahooSymbol: "NVDA", exchange: "NMS" },
  { ticker: "AAPL", name: "Apple", market: "US", yahooSymbol: "AAPL", exchange: "NMS" },
  { ticker: "005930", name: "삼성전자", market: "KR", yahooSymbol: "005930.KS", exchange: "KSC" },
  { ticker: "TSLA", name: "Tesla", market: "US", yahooSymbol: "TSLA", exchange: "NMS" },
];

const PIPELINE_STEPS: PipelineStepId[] = ["analysts", "research", "trader", "risk", "portfolio"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AgentDeskPanel() {
  const { t } = useI18n();
  const { accessToken, loading: authLoading, enforced, isActive, entitlements, isPending } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const [query, setQuery] = useState("NVDA");
  const [analysisDate, setAnalysisDate] = useState(todayIso);
  const [engine, setEngine] = useState<TradingAgentsEngine>("auto");
  const [report, setReport] = useState<DeepAgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<PipelineStepId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const canRun =
    !enforced || (Boolean(accessToken) && isActive && Boolean(entitlements?.agent_desk));

  useEffect(() => {
    return () => {
      if (stepTimer.current) clearInterval(stepTimer.current);
    };
  }, []);

  const startStepAnimation = () => {
    if (stepTimer.current) clearInterval(stepTimer.current);
    let i = 0;
    setActiveStep(PIPELINE_STEPS[0] ?? null);
    stepTimer.current = setInterval(() => {
      i += 1;
      if (i >= PIPELINE_STEPS.length) return;
      setActiveStep(PIPELINE_STEPS[i] ?? null);
    }, 4200);
  };

  const stopStepAnimation = () => {
    if (stepTimer.current) {
      clearInterval(stepTimer.current);
      stepTimer.current = null;
    }
    setActiveStep(null);
  };

  const runAnalysis = async (symbol: string) => {
    if (authLoading) return;
    if (enforced && !accessToken) {
      setError(t("auth_sign_in_first"));
      return;
    }
    if (enforced && isPending) {
      setError(t("auth_notice_pending"));
      return;
    }
    if (enforced && !entitlements?.agent_desk) {
      setError(t("auth_err_need_premium"));
      return;
    }

    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    startStepAnimation();

    try {
      const result = await runAgentDeskAnalysis({
        data: {
          ticker: symbol,
          accessToken,
          geminiApiKey: geminiApiKey ?? undefined,
          analysisDate,
          engine,
        },
      });
      if (seq !== requestSeq.current) return;
      setReport(result);
      setQuery(result.ticker);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const msg = e instanceof Error ? e.message : "agent_desk_failed";
      setError(formatFeatureError(msg === "agent_desk_sidecar_unavailable" ? "agent_desk_sidecar_unavailable" : msg, t));
      setReport(null);
    } finally {
      if (seq === requestSeq.current) {
        stopStepAnimation();
        setLoading(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <AgentDeskSetupPanel />

      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2 text-primary">
              <Bot className="h-5 w-5" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">ta.* · TradingAgents</span>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">{t("ta_desk_intro")}</p>
            <div className="mt-3">
              <AgentDeskPipelineLegend />
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_auto_auto] lg:items-end">
          <label className="block">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("ws_ticker_label")}
            </span>
            <StockSearchCombobox
              value={query}
              onChange={setQuery}
              onSelect={(item) => {
                setQuery(item.ticker);
                void runAnalysis(item.ticker);
              }}
              disabled={loading}
            />
          </label>

          <label className="block lg:w-40">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {t("ta_analysis_date")}
            </span>
            <input
              type="date"
              value={analysisDate}
              max={todayIso()}
              onChange={(e) => setAnalysisDate(e.target.value)}
              disabled={loading}
              className="mt-1 w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
            />
          </label>

          <label className="block lg:w-48">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              <Settings2 className="h-3 w-3" />
              {t("ta_engine_mode")}
            </span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value as TradingAgentsEngine)}
              disabled={loading}
              className="mt-1 w-full rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10 disabled:opacity-50"
            >
              <option value="auto">{t("ta_engine_auto")}</option>
              <option value="sidecar">{t("ta_engine_sidecar")}</option>
              <option value="ts">{t("ta_engine_ts")}</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {QUICK_PICKS.map((p) => (
              <button
                key={p.ticker}
                type="button"
                onClick={() => {
                  setQuery(p.ticker);
                  void runAnalysis(p.ticker);
                }}
                disabled={loading}
                className="rounded-full border border-hairline px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
              >
                {p.ticker}
              </button>
            ))}
          </div>
          <button
            onClick={() => void runAnalysis(query.trim())}
            disabled={loading || !query.trim() || authLoading || !canRun}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("ta_run_analysis")}
          </button>
        </div>

        <p className="mt-3 text-[11px] text-muted-foreground">{t("ta_engine_hint")}</p>
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
      </section>

      {loading ? <AgentDeskPipelineProgress activeStep={activeStep} loading={loading} /> : null}

      {report ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-bold">{report.name}</h2>
            <RatingBadge rating={report.rating} />
            <span className="text-xs text-muted-foreground">{report.ticker}</span>
            <span className="text-xs text-muted-foreground">· {report.analysisDate}</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                report.source === "tradingagents-ms"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {report.source === "tradingagents-ms" ? t("ta_source_sidecar") : t("ta_source_ts")}
            </span>
          </div>

          <WallStreetPriceChart ticker={report.ticker} market={report.market} />
          <AgentDeskReportView report={report} />
        </section>
      ) : null}
    </div>
  );
}

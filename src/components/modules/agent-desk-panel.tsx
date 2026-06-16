import { useRef, useState } from "react";
import { Bot, Loader2 } from "lucide-react";

import { DeepAgentReportScroll } from "@/components/deep-agent-report-scroll";
import { RatingBadge } from "@/components/rating-badge";
import { StockSearchCombobox } from "@/components/stock-search-combobox";
import { WallStreetPriceChart } from "@/components/wall-street-price-chart";
import { runAgentDeskAnalysis } from "@/lib/api/ta.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
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

export function AgentDeskPanel() {
  const { t } = useI18n();
  const { accessToken, loading: authLoading, enforced, isActive, entitlements, isPending } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const [query, setQuery] = useState("NVDA");
  const [report, setReport] = useState<DeepAgentReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const canRun =
    !enforced || (Boolean(accessToken) && isActive && Boolean(entitlements?.agent_desk));

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
    try {
      const result = await runAgentDeskAnalysis({
        data: { ticker: symbol, accessToken, geminiApiKey: geminiApiKey ?? undefined },
      });
      if (seq !== requestSeq.current) return;
      setReport(result);
      setQuery(result.ticker);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      setError(formatFeatureError(e instanceof Error ? e.message : "agent_desk_failed", t));
      setReport(null);
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2 text-primary">
          <Bot className="h-5 w-5" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">ta.* · TradingAgents</span>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">{t("ta_desk_intro")}</p>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1">
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
          <button
            onClick={() => void runAnalysis(query.trim())}
            disabled={loading || !query.trim() || authLoading || !canRun}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("ta_run_analysis")}
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PICKS.map((p) => (
            <button
              key={p.ticker}
              type="button"
              onClick={() => {
                setQuery(p.ticker);
                void runAnalysis(p.ticker);
              }}
              className="rounded-full border border-hairline px-3 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
            >
              {p.ticker}
            </button>
          ))}
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
      </section>

      {report ? (
        <section className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-xl font-bold">{report.name}</h2>
            <RatingBadge rating={report.rating} />
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                report.source === "tradingagents-ms"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {report.source === "tradingagents-ms" ? "TradingAgents MS" : "WallPilot TS"}
            </span>
          </div>

          <WallStreetPriceChart ticker={report.ticker} market={report.market} />

          <DeepAgentReportScroll markdownEn={report.markdown} markdownKo={report.markdownKo} />
        </section>
      ) : null}
    </div>
  );
}

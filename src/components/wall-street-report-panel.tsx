import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { RatingBadge } from "@/components/rating-badge";
import { StockSearchCombobox } from "@/components/stock-search-combobox";
import { DeepAgentReportScroll } from "@/components/deep-agent-report-scroll";
import { WallStreetPriceChart } from "@/components/wall-street-price-chart";
import { generateDeepAgentReport } from "@/lib/api/agent-deep-report.functions";
import { generateWallStreetReport } from "@/lib/api/wall-street-report.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import type { StockSearchResult } from "@/lib/types/search";
import type { DeepAgentReport, WallStreetReport } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

const QUICK_PICKS: StockSearchResult[] = [
  { ticker: "005930", name: "삼성전자", market: "KR", yahooSymbol: "005930.KS", exchange: "KSC" },
  { ticker: "000660", name: "SK하이닉스", market: "KR", yahooSymbol: "000660.KS", exchange: "KSC" },
  { ticker: "035420", name: "NAVER", market: "KR", yahooSymbol: "035420.KS", exchange: "KSC" },
  { ticker: "NVDA", name: "NVIDIA", market: "US", yahooSymbol: "NVDA", exchange: "NMS" },
  { ticker: "AAPL", name: "Apple", market: "US", yahooSymbol: "AAPL", exchange: "NMS" },
  { ticker: "TSLA", name: "Tesla", market: "US", yahooSymbol: "TSLA", exchange: "NMS" },
];

export function WallStreetReportPanel() {
  const { t } = useI18n();
  const { accessToken, loading: authLoading, enforced, isActive, entitlements, isPending } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const [query, setQuery] = useState("005930");
  const [report, setReport] = useState<WallStreetReport | null>(null);
  const [deepReport, setDeepReport] = useState<DeepAgentReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeepLoading, setIsDeepLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const canRunReport =
    !enforced || (Boolean(accessToken) && isActive && Boolean(entitlements?.wall_report));

  const guardReport = (): boolean => {
    if (authLoading) return false;
    if (enforced && !accessToken) {
      setError(t("auth_sign_in_first"));
      return false;
    }
    if (enforced && isPending) {
      setError(t("auth_notice_pending"));
      return false;
    }
    if (enforced && !entitlements?.wall_report) {
      setError(t("auth_err_need_pro"));
      return false;
    }
    return true;
  };

  const runReport = async (symbol: string) => {
    if (!guardReport()) return;
    const seq = ++requestSeq.current;
    setIsLoading(true);
    setError(null);
    try {
      const result = await generateWallStreetReport({
        data: { ticker: symbol, accessToken, geminiApiKey: geminiApiKey ?? undefined },
      });
      if (seq !== requestSeq.current) return;
      setReport(result);
      setDeepReport(null);
      setQuery(result.ticker);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const raw = e instanceof Error ? e.message : "report_failed";
      setError(formatFeatureError(raw, t));
      setReport(null);
      setDeepReport(null);
    } finally {
      if (seq === requestSeq.current) setIsLoading(false);
    }
  };

  useEffect(() => {
    const fromPilot = sessionStorage.getItem("wallpilot-ws-ticker");
    if (fromPilot) {
      sessionStorage.removeItem("wallpilot-ws-ticker");
      setQuery(fromPilot);
      void runReport(fromPilot);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link from AI Pilot
  }, []);

  const runDeepReport = async (symbol: string) => {
    if (!guardReport()) return;
    const seq = ++requestSeq.current;
    setIsDeepLoading(true);
    setError(null);
    try {
      const result = await generateDeepAgentReport({
        data: { ticker: symbol, accessToken, geminiApiKey: geminiApiKey ?? undefined },
      });
      if (seq !== requestSeq.current) return;
      setDeepReport(result);
      setReport(result);
      setQuery(result.ticker);
    } catch (e) {
      if (seq !== requestSeq.current) return;
      const raw = e instanceof Error ? e.message : "deep_report_failed";
      setError(formatFeatureError(raw, t));
      setDeepReport(null);
    } finally {
      if (seq === requestSeq.current) setIsDeepLoading(false);
    }
  };

  const handleSelect = (item: StockSearchResult) => {
    setQuery(item.ticker);
    runReport(item.ticker);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {t("ws_ticker_label")}
            </span>
            <StockSearchCombobox
              value={query}
              onChange={setQuery}
              onSelect={handleSelect}
              disabled={isLoading || isDeepLoading}
            />
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              onClick={() => runReport(query.trim())}
              disabled={isLoading || isDeepLoading || !query.trim() || authLoading || !canRunReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition active:scale-[0.98] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("ws_generate")}
            </button>
            <button
              onClick={() => runDeepReport(query.trim())}
              disabled={isLoading || isDeepLoading || !query.trim() || authLoading || !canRunReport}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary bg-primary/5 px-6 py-3 text-sm font-semibold text-primary transition active:scale-[0.98] disabled:opacity-50"
            >
              {isDeepLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("ws_deep_agent")}
            </button>
          </div>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("ws_quick_picks")}
          </p>
          <div className="flex flex-wrap gap-2">
            {QUICK_PICKS.map((p) => (
              <button
                key={`${p.market}-${p.ticker}`}
                onClick={() => handleSelect(p)}
                className="rounded-full border border-hairline bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/40 hover:text-foreground"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
      </section>

      {report && (
        <ReportView report={report} deepReport={deepReport} accessToken={accessToken} />
      )}
    </div>
  );
}

function ReportView({
  report,
  deepReport,
  accessToken,
}: {
  report: WallStreetReport;
  deepReport: DeepAgentReport | null;
  accessToken: string | null;
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-hairline bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              {t("ws_report_kicker")}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-foreground">
              {report.name}{" "}
              <span className="text-muted-foreground">({report.ticker})</span>
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {report.market === "US" ? "US · NYSE / NASDAQ" : "KR · KOSPI / KOSDAQ"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <RatingBadge rating={report.rating} className="text-xs px-2.5 py-1" />
            <RecBadge value={report.combined.recommendation} large />
          </div>
        </div>

        {report.technicalLabel && (
          <p className="mt-4 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t("technical_label")}: </span>
            {report.technicalLabel}
          </p>
        )}

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label={t("ws_fair_value")} value={formatVal(report.combined.fairValue, report.currency)} />
          <Metric label={t("ws_margin")} value={`${report.combined.marginOfSafetyPct.toFixed(1)}%`} />
          <Metric label={t("buying_zone")} value={report.combined.buyingZone} />
          <Metric label={t("profit_target")} value={report.combined.profitTarget} positive />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <GuruCard
          title={t("ws_lynch")}
          subtitle="GARP · PEG"
          recommendation={report.lynch.recommendation}
          rows={[
            ["PEG", report.lynch.pegRatio.toFixed(2)],
            [t("ws_lynch_score"), String(report.lynch.lynchScore)],
            [t("ws_company_type"), report.lynch.companyType],
            [t("ws_upside"), `${report.lynch.upsidePct}%`],
          ]}
        />
        <GuruCard
          title={t("ws_greenblatt")}
          subtitle="Magic Formula"
          recommendation={report.greenblatt.recommendation}
          rows={[
            ["ROIC", `${report.greenblatt.roic}%`],
            ["EY", `${report.greenblatt.earningsYield}%`],
            [t("ws_grade"), report.greenblatt.investmentGrade],
            [t("ws_magic_score"), String(report.greenblatt.magicScore)],
          ]}
        />
        <GuruCard
          title={t("ws_supply")}
          subtitle={report.market === "KR" ? "pykrx via MCP" : "KR only"}
          recommendation={supplyRec(report.supply.trend)}
          rows={[
            [t("ws_foreign"), formatFlow(report.supply.foreignNetAmount)],
            [t("ws_institution"), formatFlow(report.supply.institutionNetAmount)],
            [t("ws_trend"), report.supply.label],
          ]}
        />
      </div>

      <WallStreetPriceChart report={report} accessToken={accessToken} />

      <section className="rounded-2xl border border-hairline bg-surface p-5">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          {t("catalysts")}
        </h3>
        <ul className="mt-3 space-y-2">
          {report.catalysts.map((c, i) => (
            <li key={i} className="flex gap-2 text-sm text-foreground">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </section>

      {deepReport && (
        <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-foreground">{t("ws_deep_agent")}</h3>
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
              {t("ws_deep_source")}: {deepReport.source}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-[10px] font-semibold text-positive">{t("bull_case")}</p>
              <p className="mt-1 text-sm">{deepReport.debate.bullCase}</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-destructive">{t("bear_case")}</p>
              <p className="mt-1 text-sm">{deepReport.debate.bearCase}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{t("verdict")}: </span>
            {deepReport.debate.verdict}
          </p>
          <div className="rounded-xl border border-hairline bg-white p-4 text-xs">
            <p className="font-semibold">{t("risk_gate_title")}</p>
            <p className="mt-2">{deepReport.riskGate.reason}</p>
          </div>
          <DeepAgentReportScroll
            markdownEn={deepReport.markdown}
            markdownKo={deepReport.markdownKo}
          />
        </section>
      )}

      <p className="text-center text-[11px] text-muted-foreground">{t("ws_disclaimer")}</p>
    </div>
  );
}

function GuruCard({
  title,
  subtitle,
  recommendation,
  rows,
}: {
  title: string;
  subtitle: string;
  recommendation: string;
  rows: [string, string][];
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-sm font-semibold">{title}</h3>
          <p className="text-[10px] text-muted-foreground">{subtitle}</p>
        </div>
        <RecBadge value={recommendation} />
      </div>
      <dl className="mt-4 space-y-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-2 text-xs">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="font-display font-semibold tabular-nums text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Metric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive?: boolean;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-surface px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 font-display text-sm font-semibold tabular-nums",
          positive ? "text-positive" : "text-foreground",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function RecBadge({ value, large }: { value: string; large?: boolean }) {
  const tone =
    value.includes("Strong Buy") || value === "Buy"
      ? "bg-emerald-50 text-positive"
      : value.includes("Sell")
        ? "bg-red-50 text-destructive"
        : "bg-amber-50 text-amber-700";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide",
        tone,
        large && "px-3 py-1.5 text-xs",
      )}
    >
      {value}
    </span>
  );
}

function formatVal(n: number, currency: "KRW" | "USD") {
  return currency === "USD" ? `$${n.toFixed(2)}` : `₩${Math.round(n).toLocaleString("ko-KR")}`;
}

function formatFlow(n: number | null) {
  if (n == null) return "—";
  const eok = n / 1e8;
  return `${eok >= 0 ? "+" : ""}${eok.toFixed(0)}억`;
}

function supplyRec(trend: string) {
  if (trend === "strong_buy" || trend === "accumulating") return "Buy";
  if (trend === "strong_sell" || trend === "selling") return "Sell";
  return "Hold";
}

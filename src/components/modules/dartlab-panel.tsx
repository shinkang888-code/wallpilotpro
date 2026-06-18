import { useEffect, useRef, useState } from "react";

import {

  Building2,

  ExternalLink,

  FileSpreadsheet,

  Loader2,

  Scale,

  Sparkles,

} from "lucide-react";

import { toast } from "sonner";



import { DartStockNameCodeSearch } from "@/components/modules/dart-stock-name-code-search";

import {

  DartCpaLoadingState,

  DartCpaReport,

  DartMetricHealthGrid,

} from "@/components/modules/dart-cpa-report";

import { analyzeDartLab, getDartLabStatus } from "@/lib/api/dart.functions";

import { formatFeatureError } from "@/lib/auth/format-feature-error";

import { useI18n } from "@/lib/i18n";

import { useAuth } from "@/lib/use-auth";

import { useGeminiApiKey } from "@/lib/use-gemini-api-key";

import type { StockSearchResult } from "@/lib/types/search";

import type { DartLabAnalysis } from "@/lib/modules/dart/types";

import { cn } from "@/lib/utils";



const QUICK_PICKS: StockSearchResult[] = [

  { ticker: "005930", name: "삼성전자", market: "KR", yahooSymbol: "005930.KS", exchange: "KSC" },

  { ticker: "000660", name: "SK하이닉스", market: "KR", yahooSymbol: "000660.KS", exchange: "KSC" },

  { ticker: "005380", name: "현대차", market: "KR", yahooSymbol: "005380.KS", exchange: "KSC" },

  { ticker: "035420", name: "NAVER", market: "KR", yahooSymbol: "035420.KS", exchange: "KSC" },

];



type TabId = "ai" | "financials" | "disclosures" | "metrics";



function fmtM(n: number | null): string {

  if (n == null) return "-";

  return `${Math.round(n).toLocaleString("ko-KR")}`;

}



function fmtPct(n: number | null): string {

  if (n == null) return "-";

  return `${n.toFixed(1)}%`;

}



export function DartLabPanel() {

  const { t } = useI18n();

  const auth = useAuth();

  const { key: geminiApiKey } = useGeminiApiKey();

  const [companyName, setCompanyName] = useState("삼성전자");
  const [stockCode, setStockCode] = useState("005930");

  const [tab, setTab] = useState<TabId>("ai");

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<DartLabAnalysis | null>(null);

  const [opendartOk, setOpendartOk] = useState(false);

  const requestSeq = useRef(0);



  useEffect(() => {

    void getDartLabStatus({ data: { geminiApiKey: geminiApiKey ?? undefined } }).then((s) => {
      setOpendartOk(s.opendartConfigured);
    });

  }, [geminiApiKey]);



  const canRun =

    !auth.enforced || (Boolean(auth.accessToken) && auth.isActive && Boolean(auth.entitlements?.dart_lab));



  const runAnalysis = async (codeInput?: string) => {
    const code = (codeInput ?? stockCode).trim();

    if (!/^\d{6}$/.test(code)) {
      setError(t("dart_invalid_code"));
      return;
    }

    if (auth.enforced && !auth.accessToken) {

      setError(t("auth_sign_in_first"));

      return;

    }

    if (auth.enforced && !auth.entitlements?.dart_lab) {

      setError(t("auth_err_need_pro"));

      return;

    }



    const seq = ++requestSeq.current;

    setLoading(true);

    setError(null);

    setTab("ai");

    try {

      const data = await analyzeDartLab({

        data: { stockCode: code, accessToken: auth.accessToken, geminiApiKey: geminiApiKey ?? undefined },

      });

      if (seq !== requestSeq.current) return;

      setResult(data);

      setStockCode(data.stockCode);

      setCompanyName(data.corpName);

      toast.success(
        data.aiMode === "gemini"
          ? t("dart_analysis_done")
          : data.aiMode === "rules"
            ? t("dart_analysis_rules_done")
            : t("dart_gemini_hint"),
      );

    } catch (e) {

      if (seq !== requestSeq.current) return;

      setError(formatFeatureError(e instanceof Error ? e.message : "dart_failed", t));

      setResult(null);

    } finally {

      if (seq === requestSeq.current) setLoading(false);

    }

  };



  const tabs: { id: TabId; label: string; icon: typeof Sparkles }[] = [

    { id: "ai", label: t("dart_tab_ai"), icon: Sparkles },

    { id: "metrics", label: t("dart_tab_metrics"), icon: Scale },

    { id: "financials", label: t("dart_tab_financials"), icon: FileSpreadsheet },

    { id: "disclosures", label: t("dart_tab_disclosures"), icon: Building2 },

  ];



  return (

    <div className="space-y-8">

      <section className="rounded-2xl border border-hairline bg-gradient-to-br from-rose-50/80 via-surface to-surface p-5 sm:p-6">

        <div className="mb-4 flex items-center gap-2 text-rose-700">

          <FileSpreadsheet className="h-5 w-5" />

          <span className="text-[10px] font-bold uppercase tracking-[0.2em]">dart.* · DARTLAB</span>

        </div>

        <p className="mb-4 text-sm text-muted-foreground">{t("dart_intro")}</p>



        <div className="mb-4 flex flex-wrap gap-2">
          {!opendartOk && (
            <p className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              {t("dart_opendart_hint")}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex-1">
            <DartStockNameCodeSearch
              companyName={companyName}
              stockCode={stockCode}
              onCompanyNameChange={setCompanyName}
              onStockCodeChange={setStockCode}
              disabled={loading}
            />
          </div>

          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={loading || !stockCode.trim() || !canRun || !opendartOk}

            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"

          >

            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}

            {t("dart_run_analysis")}

          </button>

        </div>



        <div className="mt-3 flex flex-wrap gap-2">

          {QUICK_PICKS.map((p) => (

            <button

              key={p.ticker}

              type="button"

              onClick={() => {
                setCompanyName(p.name);
                setStockCode(p.ticker);
                void runAnalysis(p.ticker);
              }}

              className="rounded-full border border-hairline px-3 py-1 text-xs text-muted-foreground hover:border-rose-400 hover:text-rose-700"

            >

              {p.ticker}

            </button>

          ))}

        </div>



        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      </section>



      {loading && !result ? <DartCpaLoadingState /> : null}



      {result ? (

        <section className="space-y-5">

          <div className="rounded-2xl border border-hairline bg-surface p-5">

            <div className="flex flex-wrap items-start justify-between gap-3">

              <div>

                <h2 className="font-display text-xl font-bold">{result.corpName}</h2>

                <p className="mt-1 text-sm text-muted-foreground">

                  {result.stockCode} · {result.profile.ceoNm ? `대표 ${result.profile.ceoNm}` : ""}

                  {result.financials ? ` · ${result.financials.bsnsYear}년 ${result.financials.reprtName}` : ""}

                </p>

              </div>

              <span

                className={cn(

                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",

                  result.source === "dartlab-ms"

                    ? "bg-emerald-100 text-emerald-800"

                    : "bg-rose-100 text-rose-800",

                )}

              >

                {result.source === "dartlab-ms" ? "DartLab MS" : "OpenDART"}

              </span>

            </div>

          </div>



          <div className="flex flex-wrap gap-2 border-b border-hairline pb-2">

            {tabs.map(({ id, label, icon: Icon }) => (

              <button

                key={id}

                type="button"

                onClick={() => setTab(id)}

                className={cn(

                  "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold",

                  tab === id ? "bg-rose-600 text-white" : "text-muted-foreground hover:bg-muted",

                )}

              >

                <Icon className="h-3.5 w-3.5" />

                {label}

              </button>

            ))}

          </div>



          {tab === "ai" && (

            <>

              {loading ? <DartCpaLoadingState /> : null}

              {!loading ? <DartCpaReport result={result} /> : null}

            </>

          )}



          {tab === "metrics" && (

            <div className="space-y-4">

              <DartMetricHealthGrid result={result} />

              <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">

                <table className="w-full min-w-[480px] text-left text-sm">

                  <thead className="border-b border-hairline bg-muted/40 text-xs uppercase text-muted-foreground">

                    <tr>

                      <th className="px-4 py-3">{t("dart_metric_name")}</th>

                      <th className="px-4 py-3">{t("dart_metric_value")}</th>

                    </tr>

                  </thead>

                  <tbody>

                    {[

                      [t("dart_metric_revenue"), `${fmtM(result.metrics.revenue)} 백만원`],

                      [t("dart_metric_op_income"), `${fmtM(result.metrics.operatingIncome)} 백만원`],

                      [t("dart_metric_net_income"), `${fmtM(result.metrics.netIncome)} 백만원`],

                      [t("dart_metric_assets"), `${fmtM(result.metrics.totalAssets)} 백만원`],

                      [t("dart_metric_debt_ratio"), fmtPct(result.metrics.debtRatio)],

                      [t("dart_metric_op_margin"), fmtPct(result.metrics.operatingMargin)],

                      [t("dart_metric_roe"), fmtPct(result.metrics.roe)],

                      [t("dart_metric_current_ratio"), fmtPct(result.metrics.currentRatio)],

                    ].map(([name, value]) => (

                      <tr key={name} className="border-b border-hairline/60">

                        <td className="px-4 py-3 font-medium">{name}</td>

                        <td className="px-4 py-3 tabular-nums">{value}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              </div>

            </div>

          )}



          {tab === "financials" && (

            <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">

              {result.financials?.rows.length ? (

                <table className="w-full min-w-[640px] text-left text-xs sm:text-sm">

                  <thead className="border-b border-hairline bg-muted/40 text-xs uppercase text-muted-foreground">

                    <tr>

                      <th className="px-3 py-2">구분</th>

                      <th className="px-3 py-2">계정</th>

                      <th className="px-3 py-2">당기(백만원)</th>

                      <th className="px-3 py-2">전기(백만원)</th>

                    </tr>

                  </thead>

                  <tbody>

                    {result.financials.rows.slice(0, 40).map((row, i) => (

                      <tr key={`${row.accountNm}-${i}`} className="border-b border-hairline/50">

                        <td className="px-3 py-2 text-muted-foreground">{row.sjDiv}</td>

                        <td className="px-3 py-2">{row.accountNm}</td>

                        <td className="px-3 py-2 tabular-nums">{fmtM(row.currentAmount)}</td>

                        <td className="px-3 py-2 tabular-nums">{fmtM(row.priorAmount)}</td>

                      </tr>

                    ))}

                  </tbody>

                </table>

              ) : (

                <p className="p-6 text-sm text-muted-foreground">{t("dart_no_financials")}</p>

              )}

            </div>

          )}



          {tab === "disclosures" && (

            <div className="overflow-x-auto rounded-2xl border border-hairline bg-surface">

              <table className="w-full min-w-[560px] text-left text-sm">

                <thead className="border-b border-hairline bg-muted/40 text-xs uppercase text-muted-foreground">

                  <tr>

                    <th className="px-4 py-3">{t("dart_disclosure_date")}</th>

                    <th className="px-4 py-3">{t("dart_disclosure_title")}</th>

                    <th className="px-4 py-3" />

                  </tr>

                </thead>

                <tbody>

                  {result.disclosures.map((d) => (

                    <tr key={d.rceptNo} className="border-b border-hairline/60">

                      <td className="px-4 py-3 tabular-nums text-muted-foreground">{d.rceptDt}</td>

                      <td className="px-4 py-3">{d.reportNm}</td>

                      <td className="px-4 py-3 text-right">

                        <a

                          href={d.dartUrl}

                          target="_blank"

                          rel="noreferrer"

                          className="inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline"

                        >

                          DART <ExternalLink className="h-3 w-3" />

                        </a>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>

          )}

        </section>

      ) : null}

    </div>

  );

}



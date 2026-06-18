import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AlertCircle, Bot, Scale, Sparkles } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import type { DartLabAnalysis, DartMetricGrade, DartMetricHealthItem } from "@/lib/modules/dart/types";
import { cn } from "@/lib/utils";

function fmtPct(n: number | null): string {
  if (n == null) return "-";
  return `${n.toFixed(1)}%`;
}

function gradeLabel(grade: DartMetricGrade, t: (k: string) => string): string {
  if (grade === "good") return t("dart_grade_good");
  if (grade === "caution") return t("dart_grade_caution");
  if (grade === "risk") return t("dart_grade_risk");
  return t("dart_grade_na");
}

function gradeStyles(grade: DartMetricGrade): string {
  if (grade === "good") return "border-emerald-200 bg-emerald-50 text-emerald-900";
  if (grade === "caution") return "border-amber-200 bg-amber-50 text-amber-900";
  if (grade === "risk") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-hairline bg-muted/40 text-muted-foreground";
}

function MetricHealthCard({
  title,
  item,
}: {
  title: string;
  item: DartMetricHealthItem;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("rounded-xl border p-3", gradeStyles(item.grade))}>
      <p className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-80">{title}</p>
      <p className="mt-1 font-display text-lg font-bold tabular-nums">{fmtPct(item.value)}</p>
      <p className="mt-1 text-xs font-semibold">{gradeLabel(item.grade, t)}</p>
    </div>
  );
}

export function DartMetricHealthGrid({ result }: { result: DartLabAnalysis }) {
  const { t } = useI18n();
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <MetricHealthCard title={t("dart_metric_debt_ratio")} item={result.metricHealth.debtRatio} />
      <MetricHealthCard title={t("dart_metric_roe")} item={result.metricHealth.roe} />
      <MetricHealthCard title={t("dart_metric_op_margin")} item={result.metricHealth.operatingMargin} />
      <MetricHealthCard title={t("dart_metric_current_ratio")} item={result.metricHealth.currentRatio} />
    </div>
  );
}

export function DartCpaReport({ result }: { result: DartLabAnalysis }) {
  const { t } = useI18n();
  const isAi = result.aiMode === "gemini";
  const isRules = result.aiMode === "rules";
  const aiSourceLabel =
    result.aiSource === "vercel"
      ? t("dart_ai_source_vercel")
      : result.aiSource === "local"
        ? t("dart_ai_source_local")
        : t("dart_ai_source_none");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          <Scale className="h-3 w-3" />
          {t("dart_cpa_badge")}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            isAi
              ? "bg-violet-100 text-violet-800"
              : isRules
                ? "bg-sky-100 text-sky-800"
                : "bg-muted text-muted-foreground",
          )}
        >
          {isAi ? <Sparkles className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          {isAi
            ? t("dart_ai_mode_gemini")
            : isRules
              ? t("dart_ai_mode_rules")
              : t("dart_ai_mode_fallback")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
          <Bot className="h-3 w-3" />
          {aiSourceLabel}
        </span>
      </div>

      {!isAi && !isRules && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          {t("dart_gemini_hint")}
        </p>
      )}

      {isRules && result.aiSource !== "none" && (
        <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs leading-relaxed text-sky-900">
          {t("dart_rules_with_key_hint")}
        </p>
      )}

      <DartMetricHealthGrid result={result} />

      <div
        className={cn(
          "max-h-[min(70vh,560px)] overflow-y-auto rounded-2xl border border-hairline bg-white p-5 sm:p-6",
          "[&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:border-b [&_h2]:border-hairline [&_h2]:pb-2 [&_h2]:font-display [&_h2]:text-base [&_h2]:font-bold [&_h2:first-child]:mt-0",
          "[&_h3]:mt-3 [&_h3]:mb-1.5 [&_h3]:font-display [&_h3]:text-sm [&_h3]:font-semibold",
          "[&_p]:my-2 [&_p]:text-sm [&_p]:leading-relaxed",
          "[&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:my-0.5 [&_li]:text-sm",
          "[&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs",
          "[&_th]:border [&_th]:border-hairline [&_th]:bg-muted/40 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left",
          "[&_td]:border [&_td]:border-hairline [&_td]:px-2 [&_td]:py-1.5",
          "[&_strong]:font-bold [&_strong]:text-foreground",
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.explanationMarkdown}</ReactMarkdown>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{t("dart_cpa_disclaimer")}</p>
    </div>
  );
}

export function DartCpaLoadingState() {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-dashed border-rose-200 bg-rose-50/40 p-6 text-center">
      <Sparkles className="mx-auto h-6 w-6 animate-pulse text-rose-600" />
      <p className="mt-3 text-sm font-semibold text-rose-900">{t("dart_cpa_loading")}</p>
      <p className="mt-1 text-xs text-muted-foreground">{t("dart_cpa_loading_hint")}</p>
    </div>
  );
}

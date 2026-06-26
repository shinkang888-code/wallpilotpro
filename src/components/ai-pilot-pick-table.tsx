import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { enrichAiPilotPicksFn } from "@/lib/api/ai-pilot-picks.functions";
import { useI18n, toAiPilotLang } from "@/lib/i18n";
import type { AiPilotPick } from "@/lib/types/ai-pilot";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

function isBlank(value: string | undefined | null): boolean {
  const s = (value ?? "").trim();
  return !s || s === "-" || s === "0" || s === "N/A";
}

function needsEnrichment(picks: AiPilotPick[]): boolean {
  return picks.some(
    (p) =>
      isBlank(p.entryBand) ||
      isBlank(p.stopLoss) ||
      isBlank(p.targetPrice) ||
      isBlank(p.catalystTimeline) ||
      isBlank(p.priceBand),
  );
}

function displayRank(pick: AiPilotPick, index: number): number {
  return pick.rank > 0 ? pick.rank : index + 1;
}

export function AiPilotPickTable({ picks: initialPicks }: { picks: AiPilotPick[] }) {
  const { t, lang } = useI18n();
  const { accessToken } = useAuth();
  const [picks, setPicks] = useState(initialPicks);
  const [enriching, setEnriching] = useState(false);

  const shouldEnrich = useMemo(() => needsEnrichment(initialPicks), [initialPicks]);

  useEffect(() => {
    setPicks(initialPicks);
  }, [initialPicks]);

  useEffect(() => {
    if (!shouldEnrich) return;
    let cancelled = false;
    setEnriching(true);
    void enrichAiPilotPicksFn({
      data: {
        accessToken,
        lang: toAiPilotLang(lang),
        picks: initialPicks,
      },
    })
      .then((enriched) => {
        if (!cancelled) setPicks(enriched);
      })
      .catch(() => {
        /* keep original picks on failure */
      })
      .finally(() => {
        if (!cancelled) setEnriching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, initialPicks, lang, shouldEnrich]);

  const copyTicker = (ticker: string) => {
    void navigator.clipboard.writeText(ticker);
    toast.success(t("pilot_copied"));
  };

  const openReport = (ticker: string) => {
    sessionStorage.setItem("wallpilot-ws-ticker", ticker);
  };

  const cell = (value: string) => {
    if (enriching && isBlank(value)) {
      return (
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          …
        </span>
      );
    }
    return value || "—";
  };

  return (
    <div className="space-y-3">
      {enriching && (
        <p className="flex items-center gap-2 text-[10px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          {lang === "ko"
            ? "Yahoo Finance 1년 데이터로 세력 평단·매수구간·손절·익절·뉴스 촉매를 계산 중…"
            : "Computing 1Y VWAP, entry/stop/target, and news catalysts from Yahoo Finance…"}
        </p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-hairline bg-white">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-hairline bg-surface/80 text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">{t("pilot_col_name")}</th>
              <th className="px-3 py-2.5 font-medium">{t("buying_zone")}</th>
              <th className="px-3 py-2.5 font-medium">{t("hard_stop")}</th>
              <th className="px-3 py-2.5 font-medium">{t("profit_target")}</th>
              <th className="px-3 py-2.5 font-medium">{t("pilot_col_catalyst")}</th>
              <th className="px-3 py-2.5 font-medium" />
            </tr>
          </thead>
          <tbody>
            {picks.map((p, index) => (
              <tr key={`${p.ticker}-${p.rank}-${index}`} className="border-b border-hairline last:border-0">
                <td className="px-3 py-3 font-display font-bold tabular-nums text-primary">
                  {displayRank(p, index)}
                </td>
                <td className="px-3 py-3">
                  <div className="font-display font-semibold text-foreground">{p.name || p.ticker}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {p.ticker} · {p.market}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{cell(p.priceBand)}</p>
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-foreground">
                  {cell(p.entryBand)}
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-destructive">
                  {cell(p.stopLoss)}
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-positive">
                  {cell(p.targetPrice)}
                </td>
                <td className="px-3 py-3 text-foreground">{cell(p.catalystTimeline)}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => copyTicker(p.ticker)}
                      className="rounded-lg border border-hairline p-1.5 hover:bg-surface"
                      title={t("pilot_copy")}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <Link
                      to="/wall-street-report"
                      onClick={() => openReport(p.ticker)}
                      className="rounded-lg border border-hairline p-1.5 hover:bg-surface"
                      title={t("pilot_open_report")}
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {picks.map((p, index) => (
          <div
            key={`card-${p.ticker}-${index}`}
            className={cn(
              "rounded-2xl border border-hairline bg-surface/60 p-4",
              displayRank(p, index) === 1 && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {displayRank(p, index)}
              </span>
              <span className="font-display text-sm font-semibold">
                {p.name || p.ticker} ({p.ticker})
              </span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-foreground">{p.thesis}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">{p.cashFlowNote}</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {p.matchPoints.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-primary border border-primary/20"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

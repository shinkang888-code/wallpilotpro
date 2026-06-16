import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Copy } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import type { AiPilotPick } from "@/lib/types/ai-pilot";
import { cn } from "@/lib/utils";

export function AiPilotPickTable({ picks }: { picks: AiPilotPick[] }) {
  const { t } = useI18n();

  const copyTicker = (ticker: string) => {
    void navigator.clipboard.writeText(ticker);
    toast.success(t("pilot_copied"));
  };

  const openReport = (ticker: string) => {
    sessionStorage.setItem("wallpilot-ws-ticker", ticker);
  };

  return (
    <div className="space-y-3">
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
            {picks.map((p) => (
              <tr key={`${p.ticker}-${p.rank}`} className="border-b border-hairline last:border-0">
                <td className="px-3 py-3 font-display font-bold tabular-nums text-primary">
                  {p.rank}
                </td>
                <td className="px-3 py-3">
                  <div className="font-display font-semibold text-foreground">{p.name}</div>
                  <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                    {p.ticker} · {p.market}
                  </div>
                  <p className="mt-1 text-[10px] text-muted-foreground">{p.priceBand}</p>
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-foreground">
                  {p.entryBand}
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-destructive">
                  {p.stopLoss}
                </td>
                <td className="px-3 py-3 font-display tabular-nums text-positive">
                  {p.targetPrice}
                </td>
                <td className="px-3 py-3 text-foreground">{p.catalystTimeline}</td>
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
        {picks.map((p) => (
          <div
            key={`card-${p.ticker}`}
            className={cn(
              "rounded-2xl border border-hairline bg-surface/60 p-4",
              p.rank === 1 && "border-primary/30 bg-primary/5",
            )}
          >
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[10px] font-bold text-background">
                {p.rank}
              </span>
              <span className="font-display text-sm font-semibold">
                {p.name} ({p.ticker})
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

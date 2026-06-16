import { useState } from "react";

import { RatingBadge } from "@/components/rating-badge";
import { StockChartModal } from "@/components/stock-chart-modal";
import { StrategyAdviceModal } from "@/components/strategy-advice-modal";
import { useI18n } from "@/lib/i18n";
import { MATRIX_COLUMN_SIZE } from "@/lib/quant/matrix-config";
import type { StockRow } from "@/lib/use-realtime-trading-data";
import { cn } from "@/lib/utils";
import { ChevronRight, LineChart, Sparkles } from "lucide-react";

export function StockMatrix({
  isLoading,
  hasScanned,
  shortSqueeze,
  highCash,
  selectedTicker,
  onSelect,
  onExecute,
}: {
  isLoading: boolean;
  hasScanned: boolean;
  shortSqueeze: StockRow[];
  highCash: StockRow[];
  selectedTicker: string | null;
  onSelect: (t: string | null) => void;
  onExecute: (row: StockRow) => void;
}) {
  const { t } = useI18n();

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <Column
        title={t("short_squeeze")}
        tone="danger"
        rows={shortSqueeze}
        {...{ isLoading, hasScanned, selectedTicker, onSelect, onExecute }}
      />
      <Column
        title={t("high_cash")}
        tone="positive"
        rows={highCash}
        {...{ isLoading, hasScanned, selectedTicker, onSelect, onExecute }}
      />
    </div>
  );
}

function Column({
  title,
  tone,
  rows,
  isLoading,
  hasScanned,
  selectedTicker,
  onSelect,
  onExecute,
}: {
  title: string;
  tone: "danger" | "positive";
  rows: StockRow[];
  isLoading: boolean;
  hasScanned: boolean;
  selectedTicker: string | null;
  onSelect: (t: string | null) => void;
  onExecute: (row: StockRow) => void;
}) {
  const { t } = useI18n();

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className={cn("h-1.5 w-1.5 rounded-full", tone === "danger" ? "bg-destructive shadow-[0_0_8px_rgba(237,75,75,0.5)]" : "bg-positive shadow-[0_0_8px_rgba(0,181,122,0.5)]")} />
        <h3 className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">{title}</h3>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: MATRIX_COLUMN_SIZE }).map((_, i) => <SkeletonRow key={i} />)
        ) : rows.length === 0 ? (
          <EmptyColumn message={hasScanned ? t("column_empty") : t("scan_prompt")} />
        ) : (
          rows.map((row) => (
            <StockCard
              key={row.ticker}
              row={row}
              expanded={selectedTicker === row.ticker}
              onClick={() => onSelect(selectedTicker === row.ticker ? null : row.ticker)}
              onExecute={() => onExecute(row)}
            />
          ))
        )}
      </div>
    </section>
  );
}

function EmptyColumn({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-hairline bg-surface/50 px-4 py-8 text-center text-xs text-muted-foreground">
      {message}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4">
      <div className="flex items-center justify-between">
        <div className="shimmer h-4 w-24 rounded-md" />
        <div className="shimmer h-5 w-16 rounded-full" />
      </div>
      <div className="shimmer mt-3 h-3 w-32 rounded-md" />
    </div>
  );
}

function StockCard({
  row,
  expanded,
  onClick,
  onExecute,
}: {
  row: StockRow;
  expanded: boolean;
  onClick: () => void;
  onExecute: () => void;
}) {
  const { t } = useI18n();
  const [chartOpen, setChartOpen] = useState(false);
  const [adviceOpen, setAdviceOpen] = useState(false);
  const isUS = row.currency === "USD";
  const priceLabel = isUS ? `$${row.price.toFixed(2)}` : `₩${row.price.toLocaleString()}`;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border bg-surface transition-all duration-200",
        expanded ? "border-primary/40 shadow-[0_10px_30px_-18px_rgba(49,130,246,0.5)]" : "border-hairline",
      )}
    >
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between gap-3 p-4 text-left active:scale-[0.995] transition-transform"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-sm font-semibold text-foreground">{row.ticker}</span>
            <span className="rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-hairline">
              {row.market}
            </span>
            <RatingBadge rating={row.rating} />
            {row.guruBadges?.map((badge) => (
              <span
                key={badge}
                className="rounded-md bg-primary/5 px-1.5 py-0.5 text-[10px] font-semibold text-primary border border-primary/20"
              >
                {badge}
              </span>
            ))}
          </div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{row.name}</div>
        </div>

        <div className="flex flex-col items-end gap-1.5">
          <span className="font-display text-sm font-semibold tabular-nums text-foreground">{priceLabel}</span>
          <MomentumBadge value={row.momentum} label={t("momentum_30d")} />
        </div>
        <ChevronRight
          className={cn(
            "ml-1 hidden h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:block",
            expanded && "rotate-90 text-primary",
          )}
        />
      </button>

      {expanded && (
        <ExpandedReport
          row={row}
          onExecute={onExecute}
          onChart={() => setChartOpen(true)}
          onAdvice={() => setAdviceOpen(true)}
        />
      )}
      {chartOpen && <StockChartModal row={row} onClose={() => setChartOpen(false)} />}
      {adviceOpen && <StrategyAdviceModal row={row} onClose={() => setAdviceOpen(false)} />}
    </div>
  );
}

function MomentumBadge({ value, label }: { value: number; label: string }) {
  const positive = value >= 50;
  const warm = value >= 30 && value < 50;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
        positive
          ? "bg-emerald-50 text-positive"
          : warm
            ? "bg-amber-50 text-amber-700"
            : "bg-red-50 text-destructive",
      )}
    >
      <span className="hidden sm:inline">{label}</span>
      {value > 0 ? `+${value}` : value}
    </span>
  );
}

function ExpandedReport({
  row,
  onExecute,
  onChart,
  onAdvice,
}: {
  row: StockRow;
  onExecute: () => void;
  onChart: () => void;
  onAdvice: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="border-t border-hairline bg-white px-4 pb-5 pt-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 pr-3 font-medium">{t("buying_zone")}</th>
              <th className="py-2 pr-3 font-medium">{t("profit_target")}</th>
              <th className="py-2 pr-3 font-medium">{t("hard_stop")}</th>
              <th className="py-2 font-medium">{t("vol_pred")}</th>
            </tr>
          </thead>
          <tbody className="font-display font-semibold tabular-nums text-foreground">
            <tr className="border-t border-hairline">
              <td className="py-2.5 pr-3">{row.buyingZone}</td>
              <td className="py-2.5 pr-3 text-positive">{row.profitTarget}</td>
              <td className="py-2.5 pr-3 text-destructive">{row.hardStop}</td>
              <td className="py-2.5">{row.volPrediction}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {row.technicalLabel && (
        <div className="mt-3 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{t("technical_label")}: </span>
          {row.technicalLabel}
        </div>
      )}

      {row.debate && (
        <div className="mt-4 space-y-3 rounded-xl border border-hairline bg-surface/60 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("debate_title")}
          </p>
          <div>
            <p className="text-[10px] font-semibold text-positive">{t("bull_case")}</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">{row.debate.bullCase}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-destructive">{t("bear_case")}</p>
            <p className="mt-1 text-xs leading-relaxed text-foreground">{row.debate.bearCase}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{t("verdict")}: </span>
            {row.debate.verdict}
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t("catalysts")}
        </div>
        <ul className="mt-2 space-y-1.5">
          {row.catalysts.map((c, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              <span className="leading-relaxed">{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onChart}
          className="flex items-center justify-center gap-2 rounded-2xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.98] hover:bg-surface"
        >
          <LineChart className="h-4 w-4 text-primary" />
          {t("chart_view")}
        </button>
        <button
          type="button"
          onClick={onAdvice}
          className="flex items-center justify-center gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition-all duration-200 active:scale-[0.98] hover:bg-primary/10"
        >
          <Sparkles className="h-4 w-4" />
          {t("strategy_advice")}
        </button>
      </div>

      <button
        type="button"
        onClick={onExecute}
        className="mt-3 w-full rounded-2xl bg-foreground px-5 py-3.5 text-sm font-semibold text-background transition-all duration-200 active:scale-[0.98] hover:bg-foreground/90"
      >
        {t("execute")}
      </button>
    </div>
  );
}

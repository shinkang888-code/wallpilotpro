import { Loader2, Radar } from "lucide-react";

import { RatingBadge } from "@/components/rating-badge";
import { buildStockReasons, mergeScanPicks } from "@/lib/scan/stock-reason";
import { useI18n } from "@/lib/i18n";
import type { StockRow } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

export function AiPilotScanResults({
  shortSqueeze,
  highCash,
  loading,
  error,
  visible,
}: {
  shortSqueeze: StockRow[];
  highCash: StockRow[];
  loading: boolean;
  error: string | null;
  visible: boolean;
}) {
  const { t, lang } = useI18n();

  if (!visible) return null;

  const picks = mergeScanPicks(shortSqueeze, highCash);

  return (
    <section className="border-t border-hairline bg-white/80 px-4 py-5 sm:px-6">
      <div className="mb-4 flex items-center gap-2">
        <Radar className="h-4 w-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">{t("pilot_scan_results_title")}</h3>
        {!loading && picks.length > 0 && (
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            {picks.length}
          </span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-hairline bg-surface px-4 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("pilot_scan_running")}
        </div>
      )}

      {!loading && error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          {t("pilot_scan_error")}: {error}
        </p>
      )}

      {!loading && !error && picks.length === 0 && (
        <p className="rounded-xl border border-dashed border-hairline bg-surface px-4 py-6 text-center text-xs text-muted-foreground">
          {t("pilot_scan_empty")}
        </p>
      )}

      {!loading && !error && picks.length > 0 && (
        <ul className="space-y-3">
          {picks.map(({ row, columns }) => (
            <ScanPickCard key={row.ticker} row={row} columns={columns} lang={lang} t={t} />
          ))}
        </ul>
      )}
    </section>
  );
}

function ScanPickCard({
  row,
  columns,
  lang,
  t,
}: {
  row: StockRow;
  columns: ("short_squeeze" | "high_cash")[];
  lang: "ko" | "en";
  t: (key: string) => string;
}) {
  const reasons = buildStockReasons(row, columns, lang);

  return (
    <li className="rounded-2xl border border-hairline bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-display text-sm font-semibold text-foreground">
            {row.name}{" "}
            <span className="font-mono text-xs font-normal text-muted-foreground">{row.ticker}</span>
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {row.currency === "USD"
              ? `$${row.price.toFixed(2)}`
              : `₩${row.price.toLocaleString()}`}{" "}
            · {row.market}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {columns.includes("short_squeeze") && (
            <ColumnTag label={t("short_squeeze")} tone="danger" />
          )}
          {columns.includes("high_cash") && (
            <ColumnTag label={t("high_cash")} tone="positive" />
          )}
          <RatingBadge rating={row.rating} />
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <Metric label={t("buying_zone")} value={row.buyingZone} />
        <Metric label={t("profit_target")} value={row.profitTarget} />
        <Metric label={t("hard_stop")} value={row.hardStop} />
      </div>

      <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2.5">
        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
          {t("pilot_scan_reason_title")}
        </p>
        <ul className="mt-2 space-y-1.5">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2 text-xs leading-relaxed text-foreground">
              <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
              {reason}
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

function ColumnTag({
  label,
  tone,
}: {
  label: string;
  tone: "danger" | "positive";
}) {
  return (
    <span
      className={cn(
        "rounded-md border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide",
        tone === "danger"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-800",
      )}
    >
      {label}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface px-2.5 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}

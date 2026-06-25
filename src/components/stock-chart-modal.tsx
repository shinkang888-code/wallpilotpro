import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getStockChart } from "@/lib/api/chart.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import type { ChartInterval, StockChartSeries } from "@/lib/types/chart";
import type { StockRow } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

const TABS: ChartInterval[] = ["1d", "1wk", "1mo"];

export function StockChartModal({
  row,
  onClose,
}: {
  row: StockRow | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const { key: tossKey } = useTossApiKey();
  const [interval, setChartInterval] = useState<ChartInterval>("1d");
  const [series, setSeries] = useState<StockChartSeries | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [row, onClose]);

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getStockChart({
      data: { ticker: row.ticker, market: row.market, interval, accessToken, tossKey },
    })
      .then((data) => {
        if (!cancelled) setSeries(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "chart_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row, interval, accessToken, tossKey]);

  if (!row) return null;

  const isUS = row.currency === "USD";
  const fmt = (n: number) =>
    isUS ? `$${n.toFixed(2)}` : `₩${Math.round(n).toLocaleString("ko-KR")}`;

  const chartData =
    series?.points.map((p) => ({
      date: p.date.slice(5),
      close: p.close,
      volume: p.volume,
    })) ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold">{t("chart_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {row.name} ({row.ticker}) · {fmt(series?.lastPrice ?? row.price)}
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex gap-2 border-b border-hairline px-5 py-3">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setChartInterval(tab)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold transition",
                interval === tab
                  ? "bg-primary text-primary-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === "1d" ? t("chart_daily") : tab === "1wk" ? t("chart_weekly") : t("chart_monthly")}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading && (
            <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("chart_loading")}
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && chartData.length > 0 && (
            <ChartContainer
              config={{ close: { label: t("chart_price"), color: "hsl(var(--primary))" } }}
              className="h-[280px] w-full"
            >
              <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={24} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (isUS ? `$${v}` : `${Math.round(v / 1000)}k`)}
                  width={isUS ? 48 : 56}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => fmt(Number(value))}
                      labelFormatter={(label) => label}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="close"
                  stroke="var(--color-close)"
                  fill="var(--color-close)"
                  fillOpacity={0.15}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}

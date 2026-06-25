import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { getStockChart } from "@/lib/api/chart.functions";
import { getUsdKrwRate } from "@/lib/api/fx.functions";
import { formatDualPrice } from "@/lib/format-price";
import { useI18n } from "@/lib/i18n";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import type { StockChartSeries } from "@/lib/types/chart";
import type { Currency, WallStreetReport } from "@/lib/types/stock";
import { cn } from "@/lib/utils";

const REFRESH_MS = 45_000;

export function WallStreetPriceChart({
  report,
  accessToken,
}: {
  report: WallStreetReport;
  accessToken: string | null;
}) {
  const { t } = useI18n();
  const { key: tossKey } = useTossApiKey();
  const [series, setSeries] = useState<StockChartSeries | null>(null);
  const [usdKrw, setUsdKrw] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [chart, fx] = await Promise.all([
        getStockChart({
          data: {
            ticker: report.ticker,
            market: report.market,
            interval: "1d",
            accessToken,
            tossKey,
          },
        }),
        getUsdKrwRate({ data: {} }).catch(() => null),
      ]);
      setSeries(chart);
      if (fx?.rate) setUsdKrw(fx.rate);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "chart_failed");
    } finally {
      setLoading(false);
    }
  }, [report.ticker, report.market, accessToken, tossKey]);

  useEffect(() => {
    setLoading(true);
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const livePrice = series?.lastPrice ?? report.price;
  const currency: Currency = report.currency;
  const fx = usdKrw ?? 1350;

  const dual = formatDualPrice(livePrice, currency, fx);

  const periodChange = useMemo(() => {
    if (!series || series.points.length < 2) return null;
    const first = series.points[0]!.close;
    const last = series.points.at(-1)!.close;
    if (!first) return null;
    return { pct: ((last - first) / first) * 100, bullish: last >= first };
  }, [series]);

  const dayChange = useMemo(() => {
    if (!series || series.points.length < 2) return null;
    const prev = series.points.at(-2)!.close;
    const last = series.points.at(-1)!.close;
    if (!prev) return null;
    return { pct: ((last - prev) / prev) * 100, abs: last - prev };
  }, [series]);

  const chartData =
    series?.points.map((p) => ({
      date: p.date.slice(5),
      close: p.close,
    })) ?? [];

  const bullish = periodChange?.bullish ?? true;
  const strokeColor = bullish ? "#059669" : "#dc2626";
  const gradientId = `ws-price-${report.ticker.replace(/[^a-zA-Z0-9]/g, "")}`;

  const fmtTooltipDual = (n: number) => {
    const d = formatDualPrice(n, currency, fx);
    return `${d.primary} · ${d.secondary}`;
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-slate-50 via-white to-blue-50/40 p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground">
            {t("ws_live_price")}
          </p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-display text-4xl font-bold tabular-nums tracking-tight text-foreground sm:text-5xl">
              {dual.primary}
            </span>
            {dayChange && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
                  dayChange.pct >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                )}
              >
                {dayChange.pct >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {dayChange.pct >= 0 ? "+" : ""}
                {dayChange.pct.toFixed(2)}%
              </span>
            )}
            {periodChange && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                  periodChange.bullish ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800",
                )}
              >
                3M {periodChange.pct >= 0 ? "+" : ""}
                {periodChange.pct.toFixed(1)}%
              </span>
            )}
          </div>
          <p className="mt-1.5 text-lg font-medium tabular-nums text-muted-foreground sm:text-xl">
            {dual.secondary}
            <span className="ml-2 text-xs font-normal text-muted-foreground/80">
              ({t("ws_fx_hint")} 1 USD = ₩{Math.round(fx).toLocaleString("ko-KR")})
            </span>
          </p>
        </div>
        <div className="text-right text-[10px] text-muted-foreground">
          <p>{t("chart_daily")}</p>
          <p className="mt-0.5">{t("ws_chart_refresh")}</p>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/80 bg-white/70 p-2 shadow-inner">
        {loading && chartData.length === 0 && (
          <div className="flex h-52 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("chart_loading")}
          </div>
        )}
        {error && chartData.length === 0 && (
          <p className="rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {chartData.length > 0 && (
          <ChartContainer
            config={{ close: { label: t("chart_price"), color: strokeColor } }}
            className="h-[300px] w-full sm:h-[340px]"
          >
            <AreaChart data={chartData} margin={{ left: 8, right: 8, top: 12, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.45} />
                  <stop offset="55%" stopColor={strokeColor} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                minTickGap={20}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  currency === "USD" ? `$${v}` : `${Math.round(Number(v) / 1000)}k`
                }
                width={currency === "USD" ? 52 : 56}
                domain={["auto", "auto"]}
                tick={{ fill: "#64748b", fontSize: 11 }}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => fmtTooltipDual(Number(value))}
                    labelFormatter={(label) => label}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="close"
                stroke={strokeColor}
                fill={`url(#${gradientId})`}
                strokeWidth={2.5}
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 5, fill: strokeColor, stroke: "#fff", strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        )}
        {loading && chartData.length > 0 && (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">{t("ws_chart_updating")}</p>
        )}
      </div>
    </section>
  );
}

import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import type { AiPilotLiveChart, AiPilotLiveQuote } from "@/lib/types/ai-pilot";
import { cn } from "@/lib/utils";

function fmtPrice(v: number, cur: "KRW" | "USD") {
  if (cur === "KRW") return `${Math.round(v).toLocaleString("ko-KR")}원`;
  return `$${v.toFixed(2)}`;
}

export function AiPilotLiveQuotes({ quotes }: { quotes: AiPilotLiveQuote[] }) {
  if (quotes.length === 0) return null;
  return (
    <section className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-50/70 via-white to-emerald-50/40 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-800">
          LIVE · Yahoo Finance · 실시간
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {quotes.map((q) => {
          const up = q.change30dPct >= 0;
          return (
            <div
              key={`${q.market}:${q.ticker}`}
              className="flex items-center justify-between gap-2 rounded-xl border border-hairline bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-display text-sm font-semibold text-foreground">
                  {q.name}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {q.ticker} · {q.market}
                  {q.peRatio != null ? ` · PER ${q.peRatio.toFixed(1)}` : ""}
                  {q.roe != null ? ` · ROE ${q.roe.toFixed(1)}%` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm font-bold tabular-nums text-foreground">
                  {fmtPrice(q.price, q.currency)}
                </p>
                <p
                  className={cn(
                    "inline-flex items-center gap-0.5 font-mono text-[11px] font-semibold tabular-nums",
                    up ? "text-emerald-600" : "text-rose-600",
                  )}
                >
                  {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {up ? "+" : ""}
                  {q.change30dPct.toFixed(1)}% · 30D
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function AiPilotLiveChartPanel({ chart }: { chart: AiPilotLiveChart }) {
  const data = useMemo(
    () =>
      chart.closes.map((c, i) => ({
        i,
        close: c,
      })),
    [chart.closes],
  );

  const first = chart.closes[0] ?? chart.priceNow;
  const last = chart.closes.at(-1) ?? chart.priceNow;
  const up = last >= first;
  const pct = first > 0 ? ((last - first) / first) * 100 : 0;
  const stroke = up ? "#059669" : "#e11d48";
  const fill = up ? "rgba(16,185,129,0.18)" : "rgba(244,63,94,0.18)";

  const min = Math.min(...chart.closes);
  const max = Math.max(...chart.closes);
  const pad = (max - min) * 0.08 || max * 0.02;

  return (
    <section className="rounded-2xl border border-hairline bg-white p-3">
      <header className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-hairline pb-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
            📈 6M Live Chart · {chart.name}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {chart.ticker} · {chart.market}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-sm font-bold tabular-nums text-foreground">
            {fmtPrice(chart.priceNow, chart.currency)}
          </p>
          <p
            className={cn(
              "font-mono text-[11px] font-semibold tabular-nums",
              up ? "text-emerald-600" : "text-rose-600",
            )}
          >
            {up ? "+" : ""}
            {pct.toFixed(1)}% · 6M
          </p>
        </div>
      </header>
      <div className="h-44 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${chart.ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={stroke} stopOpacity={0.35} />
                <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="i" hide />
            <YAxis
              domain={[min - pad, max + pad]}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              width={56}
              tickFormatter={(v: number) => (chart.currency === "KRW" ? Math.round(v).toLocaleString("ko-KR") : v.toFixed(0))}
            />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(v: number) => fmtPrice(v, chart.currency)}
              labelFormatter={() => ""}
            />
            {chart.high52w && (
              <ReferenceLine y={chart.high52w} stroke="#0ea5e9" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: "52W H", fontSize: 9, fill: "#0ea5e9", position: "insideTopRight" }} />
            )}
            {chart.low52w && (
              <ReferenceLine y={chart.low52w} stroke="#64748b" strokeDasharray="3 3" strokeOpacity={0.6} label={{ value: "52W L", fontSize: 9, fill: "#64748b", position: "insideBottomRight" }} />
            )}
            {chart.targetMean && (
              <ReferenceLine y={chart.targetMean} stroke="#a855f7" strokeDasharray="4 2" strokeOpacity={0.7} label={{ value: "Target", fontSize: 9, fill: "#a855f7", position: "insideTopLeft" }} />
            )}
            <Area type="monotone" dataKey="close" stroke={stroke} strokeWidth={2} fill={`url(#grad-${chart.ticker})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        {chart.high52w && <span><span className="text-sky-500">━</span> 52W High {fmtPrice(chart.high52w, chart.currency)}</span>}
        {chart.low52w && <span><span className="text-slate-500">━</span> 52W Low {fmtPrice(chart.low52w, chart.currency)}</span>}
        {chart.targetMean && <span><span className="text-purple-500">┄</span> Analyst Target {fmtPrice(chart.targetMean, chart.currency)}</span>}
      </div>
      <p className="mt-1 text-[9px] text-muted-foreground">
        실시간 데이터 · Yahoo Finance · 6개월 일봉 · 응답 시점 기준
      </p>
    </section>
  );
}

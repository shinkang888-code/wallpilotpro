import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  KeyRound,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import { TossTraderCryptoPanel } from "@/components/toss-trader/toss-trader-crypto-panel";
import type { TossHoldingItem, TossTraderFilter } from "@/lib/api/toss-trader.types";
import { useI18n } from "@/lib/i18n";
import { useTossTraderDashboard } from "@/lib/toss-trader/use-toss-trader-dashboard";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { cn } from "@/lib/utils";

import "@/styles/crypto-bot-toss.css";

function parseNum(v: string | undefined): number {
  const n = Number.parseFloat(v ?? "0");
  return Number.isFinite(n) ? n : 0;
}

function fmtKrw(n: number): string {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;
}

function fmtUsd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPct(rate: string): string {
  const pct = parseNum(rate) * 100;
  return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;
}

function PnlBadge({ value, className }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold tabular-nums",
        up ? "cb-up bg-[rgba(220,46,71,0.12)]" : "cb-down bg-[rgba(49,130,246,0.12)]",
        className,
      )}
    >
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function HoldingRow({ item }: { item: TossHoldingItem }) {
  const qty = parseNum(item.quantity);
  const last = parseNum(item.lastPrice);
  const avg = parseNum(item.averagePurchasePrice);
  const plRate = parseNum(item.profitLoss.rate);
  const dailyRate = parseNum(item.dailyProfitLoss.rate);
  const isKr = item.marketCountry === "KR";
  const value = parseNum(item.marketValue.amount);

  return (
    <div className="flex items-center gap-3 border-b cb-divider px-4 py-4 last:border-b-0 sm:px-5">
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-[var(--cb-text)]">{item.name}</p>
        <p className="mt-0.5 text-xs cb-text-muted">
          {item.symbol} · {qty.toLocaleString()}주 · 평단{" "}
          {isKr ? fmtKrw(avg) : fmtUsd(avg)}
        </p>
      </div>
      <div className="text-right">
        <p className="font-bold tabular-nums text-[var(--cb-text)]">
          {isKr ? fmtKrw(value) : fmtUsd(value)}
        </p>
        <p className="mt-1 flex items-center justify-end gap-2 text-xs tabular-nums">
          <span className={cn(plRate >= 0 ? "cb-up" : "cb-down")}>{fmtPct(item.profitLoss.rate)}</span>
          <span className="cb-text-dim">·</span>
          <span className={cn(dailyRate >= 0 ? "cb-up" : "cb-down")}>
            오늘 {fmtPct(item.dailyProfitLoss.rate)}
          </span>
        </p>
        <p className="mt-0.5 text-[11px] cb-text-dim tabular-nums">
          현재가 {isKr ? fmtKrw(last) : fmtUsd(last)}
        </p>
      </div>
    </div>
  );
}

const FILTERS: { id: TossTraderFilter; labelKey: string }[] = [
  { id: "all", labelKey: "tt_filter_all" },
  { id: "KR", labelKey: "tt_filter_kr" },
  { id: "US", labelKey: "tt_filter_us" },
  { id: "crypto", labelKey: "tt_filter_crypto" },
];

export function TossTraderDashboard() {
  const { t } = useI18n();
  const tossKey = useTossApiKey();
  const { data, loading, refreshing, error, refresh } = useTossTraderDashboard(tossKey.key);
  const [filter, setFilter] = useState<TossTraderFilter>("all");

  const holdings = data?.toss.holdings;
  const crypto = data?.crypto;

  const filteredItems = useMemo(() => {
    const items = holdings?.items ?? [];
    if (filter === "all") return items;
    if (filter === "crypto") return [];
    return items.filter((i) => i.marketCountry === filter);
  }, [holdings?.items, filter]);

  const totalKrw = parseNum(holdings?.marketValue.amount.krw);
  const totalUsd = parseNum(holdings?.marketValue.amount.usd);
  const plRate = parseNum(holdings?.profitLoss.rate);
  const plKrw = parseNum(holdings?.profitLoss.amount.krw);
  const dailyKrw = parseNum(holdings?.dailyProfitLoss.amount.krw);

  if (!tossKey.isConnected) {
    return (
      <div className="cb-toss mx-4 overflow-hidden rounded-xl cb-panel sm:mx-0">
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[rgba(49,130,246,0.12)]">
            <KeyRound className="h-7 w-7 text-[var(--cb-blue)]" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-[var(--cb-text)]">{t("tt_connect_title")}</h2>
            <p className="mt-2 max-w-md text-sm cb-text-muted">{t("tt_connect_desc")}</p>
          </div>
          <Link
            to="/my-api"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--cb-blue)] px-5 py-2.5 text-sm font-bold text-white hover:opacity-90"
          >
            {t("tt_connect_cta")}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="cb-toss flex min-h-[520px] items-center justify-center rounded-xl cb-panel mx-4 sm:mx-0">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--cb-blue)]" />
      </div>
    );
  }

  return (
    <div className="cb-toss space-y-4 overflow-hidden pb-8">
      {/* Status bar */}
      <header className="mx-4 flex flex-wrap items-center justify-between gap-3 rounded-xl cb-panel px-4 py-3 sm:mx-0 sm:px-6">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
              data?.toss.connected
                ? "bg-[rgba(49,130,246,0.15)] text-[var(--cb-blue)]"
                : "bg-[rgba(255,255,255,0.06)] cb-text-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                data?.toss.connected ? "animate-pulse bg-[var(--cb-blue)]" : "bg-[var(--cb-text-dim)]",
              )}
            />
            {data?.toss.connected ? t("tt_status_connected") : t("tt_status_disconnected")}
            {data?.toss.accountSeq != null ? (
              <span className="cb-text-dim font-normal">· #{data.toss.accountSeq}</span>
            ) : null}
          </span>
          {error ? <span className="text-xs text-amber-400">{error}</span> : null}
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void refresh(true)}
          className="cb-action-btn inline-flex items-center gap-1.5"
        >
          {refreshing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          {t("tt_refresh")}
        </button>
      </header>

      {/* Portfolio hero */}
      <section className="cb-toss mx-4 cb-panel-deep p-5 sm:mx-0 sm:p-6">
        <p className="text-sm cb-text-muted">{t("tt_total_assets")}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-2">
          {totalKrw > 0 ? (
            <span className="font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
              {fmtKrw(totalKrw)}
            </span>
          ) : null}
          {totalUsd > 0 ? (
            <span className="font-display text-2xl font-bold tabular-nums text-[var(--cb-text-muted)] sm:text-3xl">
              {fmtUsd(totalUsd)}
            </span>
          ) : null}
          {totalKrw === 0 && totalUsd === 0 ? (
            <span className="font-display text-3xl font-bold tabular-nums">—</span>
          ) : null}
          <PnlBadge value={plRate * 100} />
        </div>
        <dl className="mt-5 grid grid-cols-2 gap-4 border-t cb-divider pt-5 sm:grid-cols-4">
          <Stat label={t("tt_total_pl")} value={plKrw !== 0 ? fmtKrw(plKrw) : "—"} />
          <Stat label={t("tt_daily_pl")} value={dailyKrw !== 0 ? fmtKrw(dailyKrw) : "—"} />
          <Stat
            label={t("tt_daily_rate")}
            value={holdings ? fmtPct(holdings.dailyProfitLoss.rate) : "—"}
          />
          <Stat
            label={t("tt_buying_power")}
            value={
              data?.toss.buyingPower
                ? data.toss.buyingPower.currency === "USD"
                  ? fmtUsd(parseNum(data.toss.buyingPower.cashBuyingPower))
                  : fmtKrw(parseNum(data.toss.buyingPower.cashBuyingPower))
                : data?.toss.wallet
                  ? data.toss.wallet.krw > 0
                    ? fmtKrw(data.toss.wallet.krw)
                    : fmtUsd(data.toss.wallet.usd)
                  : "—"
            }
          />
        </dl>
      </section>

      {/* Filter chips */}
      <nav className="mx-4 flex gap-2 overflow-x-auto pb-1 sm:mx-0 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn("cb-chip shrink-0", filter === f.id && "cb-chip-active")}
          >
            {t(f.labelKey)}
          </button>
        ))}
      </nav>

      <div className="mx-4 grid gap-4 lg:grid-cols-5 sm:mx-0">
        {/* Holdings */}
        <section className="cb-panel lg:col-span-3">
          <div className="flex items-center justify-between border-b cb-divider px-4 py-3 sm:px-5">
            <h2 className="text-sm font-bold text-[var(--cb-text)]">{t("tt_holdings_title")}</h2>
            <span className="text-xs cb-text-muted">
              {filter === "crypto" ? t("tt_crypto_hint") : `${filteredItems.length}${t("tt_count_suffix")}`}
            </span>
          </div>
          {filter === "crypto" ? (
            <TossTraderCryptoPanel crypto={crypto} defaultExpanded className="border-0 bg-transparent" />
          ) : filteredItems.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm cb-text-muted">{t("tt_holdings_empty")}</p>
          ) : (
            filteredItems.map((item) => <HoldingRow key={item.symbol} item={item} />)
          )}
        </section>

        {/* Orders + order desk */}
        <aside className="space-y-4 lg:col-span-2">
          <section className="cb-panel">
            <div className="flex items-center gap-2 border-b cb-divider px-4 py-3 sm:px-5">
              <Wallet className="h-4 w-4 text-[var(--cb-blue)]" />
              <h2 className="text-sm font-bold">{t("tt_open_orders")}</h2>
              <span className="ml-auto text-xs cb-text-muted">
                {(data?.toss.openOrders.length ?? 0) + t("tt_count_suffix")}
              </span>
            </div>
            {(data?.toss.openOrders.length ?? 0) === 0 ? (
              <p className="px-5 py-8 text-center text-sm cb-text-muted">{t("tt_orders_empty")}</p>
            ) : (
              data!.toss.openOrders.map((o) => (
                <div
                  key={o.orderId}
                  className="flex items-center justify-between gap-2 border-b cb-divider px-4 py-3 last:border-b-0 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{o.symbol}</p>
                    <p className="text-xs cb-text-muted">
                      {o.side === "BUY" ? t("tt_side_buy") : t("tt_side_sell")} · {o.status}
                    </p>
                  </div>
                  <div className="text-right text-xs tabular-nums">
                    <p className="font-bold">
                      {o.currency === "KRW" ? fmtKrw(parseNum(o.price)) : fmtUsd(parseNum(o.price))}
                    </p>
                    <p className="cb-text-muted">
                      {parseNum(o.filledQuantity)}/{parseNum(o.quantity)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="cb-panel p-4 sm:p-5">
            <h2 className="text-sm font-bold">{t("tt_order_desk_title")}</h2>
            <p className="mt-2 text-xs leading-relaxed cb-text-muted">{t("tt_order_desk_desc")}</p>
            <ul className="mt-4 space-y-2 text-xs cb-text-muted">
              <li className="flex gap-2">
                <span className="text-[var(--cb-blue)]">①</span>
                {t("tt_order_step_1")}
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--cb-blue)]">②</span>
                {t("tt_order_step_2")}
              </li>
              <li className="flex gap-2">
                <span className="text-[var(--cb-blue)]">③</span>
                {t("tt_order_step_3")}
              </li>
            </ul>
            <Link
              to="/my-api"
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[rgba(49,130,246,0.35)] bg-[rgba(49,130,246,0.08)] py-2.5 text-xs font-bold text-[var(--cb-blue)] hover:bg-[rgba(49,130,246,0.15)]"
            >
              {t("tt_order_desk_cta")}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </section>
        </aside>
      </div>

      {/* Crypto bot — 인라인 확장 패널 */}
      {filter !== "crypto" ? (
        <TossTraderCryptoPanel crypto={crypto} className="mx-4 sm:mx-0" />
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] cb-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums text-[var(--cb-text)]">{value}</dd>
    </div>
  );
}
// filepath: src/components/toss-trader/toss-trader-crypto-panel.tsx
import { Link } from "@tanstack/react-router";
import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import type { TossTraderDashboardPayload } from "@/lib/api/toss-trader.functions";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] cb-text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-bold tabular-nums text-[var(--cb-text)]">{value}</dd>
    </div>
  );
}

type Props = {
  crypto: TossTraderDashboardPayload["crypto"] | undefined;
  defaultExpanded?: boolean;
  className?: string;
};

export function TossTraderCryptoPanel({ crypto, defaultExpanded = false, className }: Props) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);

  const online = crypto?.connection.online ?? false;
  const profitPct = crypto?.profit?.profitClosedPercent ?? 0;
  const profitCoin = crypto?.profit?.profitAllCoin ?? 0;
  const up = profitPct >= 0;

  return (
    <section className={cn("cb-panel overflow-hidden", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b cb-divider px-4 py-3 sm:px-6">
        <div>
          <p className="text-xs font-semibold text-[var(--cb-blue)]">{t("tt_crypto_section_label")}</p>
          <h2 className="text-sm font-bold">{t("tt_crypto_section_title")}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/my-api"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-blue)] hover:underline"
          >
            {t("tt_crypto_open_full")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors",
              expanded
                ? "border-[rgba(49,130,246,0.35)] bg-[rgba(49,130,246,0.12)] text-[var(--cb-blue)]"
                : "border-[var(--cb-border)] bg-[var(--cb-bg-overlay)] text-[var(--cb-text)] hover:bg-[rgba(255,255,255,0.04)]",
            )}
          >
            {expanded ? t("tt_crypto_collapse") : t("tt_crypto_setup")}
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform duration-300", expanded && "rotate-180")}
            />
          </button>
        </div>
      </div>

      <div className="border-b cb-divider">
        {!online ? (
          <div className="px-5 py-8 text-center">
            <p className="text-sm font-semibold cb-text-muted">{t("tt_crypto_offline")}</p>
            <p className="mt-2 text-xs cb-text-dim">{t("tt_crypto_offline_desc")}</p>
            {!expanded ? (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--cb-blue)] hover:underline"
              >
                {t("tt_crypto_setup")}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-4 sm:p-6">
            <div>
              <p className="text-xs cb-text-muted">{t("tt_crypto_pnl")}</p>
              <p className="mt-1 font-display text-2xl font-bold tabular-nums">
                {profitCoin >= 0 ? "+" : ""}
                {profitCoin.toFixed(2)}
                <span className="ml-1 text-base cb-text-muted">USDT</span>
              </p>
              <span
                className={cn(
                  "mt-2 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold",
                  up ? "cb-up bg-[rgba(220,46,71,0.12)]" : "cb-down bg-[rgba(49,130,246,0.12)]",
                )}
              >
                {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                {up ? "+" : ""}
                {profitPct.toFixed(2)}%
              </span>
            </div>
            <Stat label={t("ft_metric_state")} value={crypto?.status?.state?.toUpperCase() ?? "—"} />
            <Stat label={t("ft_metric_strategy")} value={crypto?.status?.strategy ?? "—"} />
            <Stat
              label={t("ft_open_current")}
              value={`${crypto?.openTrades?.current ?? 0} / ${crypto?.openTrades?.max ?? 0}`}
            />
          </div>
        )}
      </div>

      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t cb-divider bg-[var(--cb-bg-deep)]">
            {expanded ? (
              <div className="space-y-4 px-4 py-5 sm:px-6">
                <p className="text-xs leading-relaxed cb-text-muted">{t("tt_crypto_inline_hint")}</p>
                {online && crypto?.demoBacktest ? (
                  <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                    <Stat label={t("ft_bt_winrate")} value={`${crypto.demoBacktest.winRate.toFixed(1)}%`} />
                    <Stat label={t("ft_bt_profit")} value={`${crypto.demoBacktest.profitPct >= 0 ? "+" : ""}${crypto.demoBacktest.profitPct.toFixed(1)}%`} />
                    <Stat label={t("ft_profit_trades")} value={String(crypto.demoBacktest.totalTrades)} />
                    <Stat label={t("ft_bt_drawdown")} value={`${crypto.demoBacktest.maxDrawdownPct.toFixed(1)}%`} />
                  </dl>
                ) : null}
                <Link
                  to="/my-api"
                  className="cb-action-primary inline-flex w-full items-center justify-center gap-2 sm:w-auto"
                >
                  {t("tt_crypto_setup")}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {expanded && !online ? (
        <p className="border-t cb-divider px-4 py-3 text-center text-xs cb-text-dim sm:px-6">
          {t("tt_crypto_inline_hint")}
        </p>
      ) : null}
    </section>
  );
}

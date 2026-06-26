import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

import { CryptoBotTossDashboard } from "@/components/crypto-bot/crypto-bot-toss-dashboard";
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
  /** 크립토 필터 탭 — 기본 펼침 */
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

      {/* 요약 스트립 — 접혀 있을 때 또는 펼쳐도 상단 요약 유지 */}
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

      {/* 확장 영역 — 크립토 봇 전체 대시보드 인라인 */}
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-300 ease-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t cb-divider bg-[var(--cb-bg-deep)]">
            {expanded ? (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <CryptoBotTossDashboard embedded />
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
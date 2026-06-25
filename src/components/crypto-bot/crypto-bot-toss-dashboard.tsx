import { Loader2, Pause, Play, Power, RefreshCw, RotateCw, Square, TrendingDown, TrendingUp } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

import { useCryptoBotEngine, type CryptoBotTab } from "@/lib/crypto-bot/use-crypto-bot-engine";
import { freqtradeApiUrl } from "@/lib/modules/ft/ft-client.browser";
import { useI18n } from "@/lib/i18n";
import type { FtOpenTrade } from "@/lib/modules/ft/types";
import { cn } from "@/lib/utils";

import "@/styles/crypto-bot-toss.css";

const TABS: { id: CryptoBotTab; labelKey: string }[] = [
  { id: "home", labelKey: "ft_ui_tab_home" },
  { id: "live", labelKey: "ft_ui_tab_live" },
  { id: "holdings", labelKey: "ft_ui_tab_holdings" },
  { id: "backtest", labelKey: "ft_ui_tab_backtest" },
  { id: "setup", labelKey: "ft_ui_tab_setup" },
];

export function CryptoBotTossDashboard({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n();
  const engine = useCryptoBotEngine();

  const shellClass = cn(
    "cb-toss space-y-0 overflow-hidden text-[var(--cb-text)]",
    !embedded && "rounded-xl cb-panel",
  );

  if (engine.loading) {
    return (
      <div className={cn(shellClass, "flex min-h-[480px] items-center justify-center")}>
        <Loader2 className="h-8 w-8 animate-spin text-[var(--cb-blue)]" />
      </div>
    );
  }

  const profitPct = engine.profit?.profitClosedPercent ?? 0;
  const profitCoin = engine.profit?.profitAllCoin ?? 0;
  const isUp = profitPct >= 0;

  return (
    <div className={shellClass}>
      {/* ── Top bar: status + refresh (토스증권 헤더 느낌) ── */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b cb-divider px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold",
              engine.online
                ? "bg-[rgba(49,130,246,0.15)] text-[var(--cb-blue)]"
                : "bg-[rgba(255,255,255,0.06)] cb-text-muted",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                engine.online ? "animate-pulse bg-[var(--cb-blue)]" : "bg-[var(--cb-text-dim)]",
              )}
            />
            {engine.online ? t("ft_status_online") : t("ft_status_offline")}
            {engine.connection?.latencyMs != null ? (
              <span className="cb-text-dim font-normal">· {engine.connection.latencyMs}ms</span>
            ) : null}
          </span>
          {engine.status?.dryRun ? (
            <span className="cb-chip cb-chip-active text-[11px] py-1 px-2.5">{t("ft_mode_dry_run")}</span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={engine.reloading}
            onClick={() => void engine.handleReload()}
            className="cb-action-btn inline-flex items-center gap-1.5"
          >
            {engine.reloading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            {t("ft_btn_reload")}
          </button>
        </div>
      </header>

      {/* ── Hero: 손익 요약 (토스 내 계좌 상단) ── */}
      <section className="cb-panel-deep mx-4 mt-4 p-5 sm:p-6">
        <p className="text-sm cb-text-muted">{t("ft_ui_total_pnl")}</p>
        <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2">
          <span className="font-display text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">
            {profitCoin >= 0 ? "+" : ""}
            {profitCoin.toFixed(2)}
            <span className="ml-1 text-2xl font-semibold cb-text-muted">USDT</span>
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold tabular-nums",
              isUp ? "cb-up bg-[rgba(220,46,71,0.12)]" : "cb-down bg-[rgba(49,130,246,0.12)]",
            )}
          >
            {isUp ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {isUp ? "+" : ""}
            {profitPct.toFixed(2)}%
          </span>
        </div>
        {engine.online && engine.status ? (
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t cb-divider pt-5 sm:grid-cols-4">
            <MiniStat label={t("ft_metric_state")} value={engine.status.state.toUpperCase()} />
            <MiniStat label={t("ft_metric_strategy")} value={engine.status.strategy ?? "—"} />
            <MiniStat label={t("ft_metric_exchange")} value={engine.status.exchange ?? "—"} />
            <MiniStat
              label={t("ft_open_current")}
              value={`${engine.openTrades?.current ?? 0} / ${engine.openTrades?.max ?? 0}`}
            />
          </dl>
        ) : null}
        {!engine.online && engine.mixedBlocked ? (
          <ConnectGuide localUrl={engine.localUiUrl} apiUrl={freqtradeApiUrl()} />
        ) : !engine.online ? (
          <p className="mt-4 text-sm cb-text-muted">{t("ft_hero_disconnected_desc")}</p>
        ) : null}
      </section>

      {/* ── Sub nav (토스 홈/피드/주식골라보기/내계좌 패턴) ── */}
      <nav className="mt-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:px-6 [scrollbar-width:none]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => engine.setActiveTab(tab.id)}
            className={cn("cb-nav-pill shrink-0", engine.activeTab === tab.id && "cb-nav-pill-active")}
          >
            {t(tab.labelKey as never)}
          </button>
        ))}
      </nav>

      {/* ── Filter chips (실시간 차트 필터) ── */}
      {(engine.activeTab === "live" || engine.activeTab === "holdings") && engine.pairs.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => engine.setPairFilter("all")}
            className={cn("cb-chip", engine.pairFilter === "all" && "cb-chip-active")}
          >
            {t("ft_ui_filter_all")}
          </button>
          {engine.pairs.map((pair) => (
            <button
              key={pair}
              type="button"
              onClick={() => engine.setPairFilter(pair)}
              className={cn("cb-chip", engine.pairFilter === pair && "cb-chip-active")}
            >
              {pair.replace("/USDT", "")}
            </button>
          ))}
        </div>
      ) : null}

      {/* ── Tab content ── */}
      <div className="px-4 py-5 sm:px-6 sm:py-6">
        {engine.notice ? (
          <p className="mb-4 rounded-lg border border-[rgba(49,130,246,0.3)] bg-[rgba(49,130,246,0.08)] px-4 py-3 text-sm text-[var(--cb-blue)]">
            {engine.notice}
          </p>
        ) : null}
        {engine.error ? (
          <p className="mb-4 rounded-lg border border-[rgba(220,46,71,0.3)] bg-[rgba(220,46,71,0.08)] px-4 py-3 text-sm cb-up">
            {engine.error}
          </p>
        ) : null}

        {engine.activeTab === "home" && <HomeTab engine={engine} profitPct={profitPct} />}
        {engine.activeTab === "live" && <LiveTab engine={engine} />}
        {engine.activeTab === "holdings" && <HoldingsTab engine={engine} />}
        {engine.activeTab === "backtest" && <BacktestTab engine={engine} />}
        {engine.activeTab === "setup" && <SetupTab />}
      </div>

      {/* ── Control dock (봇 제어 — 하단 고정 느낌) ── */}
      {engine.online && (engine.canExecute || engine.usedBrowser) ? (
        <footer className="border-t cb-divider px-4 py-4 sm:px-6">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider cb-text-dim">{t("ft_control_label")}</p>
          <div className="flex flex-wrap gap-2">
            <ControlBtn
              label={t("ft_ctrl_start")}
              icon={Play}
              busy={engine.controlBusy === "start"}
              disabled={engine.controlBusy != null || engine.status?.state === "running"}
              onClick={() => void engine.handleControl("start")}
              primary
            />
            <ControlBtn
              label={t("ft_ctrl_pause")}
              icon={Pause}
              busy={engine.controlBusy === "pause"}
              disabled={engine.controlBusy != null}
              onClick={() => void engine.handleControl("pause")}
            />
            <ControlBtn
              label={t("ft_ctrl_stop")}
              icon={Square}
              busy={engine.controlBusy === "stop"}
              disabled={engine.controlBusy != null}
              onClick={() => void engine.handleControl("stop")}
            />
            <ControlBtn
              label={t("ft_ctrl_reload")}
              icon={RotateCw}
              busy={engine.controlBusy === "reload"}
              disabled={engine.controlBusy != null}
              onClick={() => void engine.handleControl("reload")}
            />
            <ControlBtn
              label={t("ft_ctrl_forceexit")}
              icon={Power}
              busy={engine.controlBusy === "forceexit"}
              disabled={engine.controlBusy != null}
              onClick={() => void engine.handleForceExit()}
              danger
            />
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] cb-text-dim">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function ConnectGuide({ localUrl, apiUrl }: { localUrl: string; apiUrl: string }) {
  const { t } = useI18n();
  return (
    <div className="mt-5 rounded-lg border border-[rgba(255,193,7,0.25)] bg-[rgba(255,193,7,0.06)] p-4">
      <p className="text-sm font-semibold text-amber-200">{t("ft_https_title")}</p>
      <p className="mt-1 text-xs cb-text-muted">{t("ft_https_desc")}</p>
      <a
        href={localUrl}
        className="mt-3 inline-block rounded-lg bg-[var(--cb-blue)] px-4 py-2 text-xs font-bold text-white"
      >
        {t("ft_https_open_local")}
      </a>
      <p className="mt-2 font-mono text-[10px] cb-text-dim">{apiUrl}</p>
    </div>
  );
}

function HomeTab({
  engine,
  profitPct,
}: {
  engine: ReturnType<typeof useCryptoBotEngine>;
  profitPct: number;
}) {
  const { t } = useI18n();
  const sparkData = Array.from({ length: 12 }, (_, i) => ({
    i,
    v: profitPct + Math.sin(i * 0.8) * 0.3,
  }));

  return (
    <div className="space-y-4">
      <SectionTitle title={t("ft_ui_section_chart")} subtitle={t("ft_ui_section_chart_sub")} />
      <div className="cb-panel p-4">
        <ResponsiveContainer width="100%" height={120} className="cb-sparkline">
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id="cbSpark" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3182f6" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#3182f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke="#3182f6" fill="url(#cbSpark)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <SectionTitle title={t("ft_overview_pairs")} />
      <div className="flex flex-wrap gap-2">
        {engine.pairs.map((pair) => (
          <PairRow key={pair} pair={pair} online={engine.online} />
        ))}
      </div>

      <SectionTitle title={t("ft_ui_quick_stats")} />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard label={t("ft_profit_trades")} value={String(engine.profit?.tradeCount ?? 0)} />
        <StatCard
          label={t("ft_profit_winrate")}
          value={
            engine.profit?.winRate != null
              ? `${(engine.profit.winRate * 100).toFixed(1)}%`
              : "—"
          }
        />
        <StatCard label={t("ft_metric_timeframe")} value={engine.status?.timeframe ?? "5m"} />
      </div>
    </div>
  );
}

function LiveTab({ engine }: { engine: ReturnType<typeof useCryptoBotEngine> }) {
  const { t } = useI18n();
  if (!engine.online) {
    return <EmptyState text={t("ft_offline_hint")} />;
  }
  return (
    <div className="space-y-4">
      <SectionTitle title={t("ft_monitor_profit")} />
      <div className="cb-panel divide-y cb-divider">
        <LiveRow label={t("ft_profit_closed")} value={`${(engine.profit?.profitClosedCoin ?? 0).toFixed(2)} USDT`} />
        <LiveRow label={t("ft_profit_pct")} value={`${(engine.profit?.profitClosedPercent ?? 0).toFixed(2)}%`} />
        <LiveRow label={t("ft_open_stake")} value={`${(engine.openTrades?.totalStake ?? 0).toFixed(2)} USDT`} />
        <LiveRow
          label={t("ft_metric_stake")}
          value={`${engine.status?.stakeAmount ?? 30} ${engine.status?.stakeCurrency ?? "USDT"}`}
        />
      </div>
    </div>
  );
}

function HoldingsTab({ engine }: { engine: ReturnType<typeof useCryptoBotEngine> }) {
  const { t } = useI18n();
  if (!engine.online) {
    return <EmptyState text={t("ft_offline_hint")} />;
  }
  if (engine.trades.length === 0) {
    return <EmptyState text={t("ft_trades_empty")} />;
  }
  return (
    <div className="cb-panel overflow-hidden">
      <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b cb-divider px-4 py-2 text-[11px] font-bold cb-text-dim sm:grid-cols-[1fr_auto_auto_auto_auto]">
        <span>{t("ft_trades_pair")}</span>
        <span className="text-right">{t("ft_trades_open_rate")}</span>
        <span className="hidden text-right sm:block">{t("ft_trades_current")}</span>
        <span className="text-right">{t("ft_trades_stake")}</span>
        <span className="text-right">{t("ft_trades_profit")}</span>
      </div>
      {engine.trades.map((trd) => (
        <TradeRow key={trd.tradeId} trade={trd} />
      ))}
    </div>
  );
}

function BacktestTab({ engine }: { engine: ReturnType<typeof useCryptoBotEngine> }) {
  const { t } = useI18n();
  const bt = engine.backtest;
  return (
    <div className="space-y-4">
      <SectionTitle
        title={t("ft_backtest_title")}
        subtitle={`${bt?.strategy} · ${bt?.periodDays}d`}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("ft_bt_trades")} value={String(bt?.totalTrades ?? 0)} />
        <StatCard label={t("ft_bt_winrate")} value={`${bt?.winRate ?? 0}%`} />
        <StatCard
          label={t("ft_bt_profit")}
          value={`${bt?.profitPct ?? 0}%`}
          negative={(bt?.profitPct ?? 0) < 0}
        />
        <StatCard label={t("ft_bt_drawdown")} value={`${bt?.maxDrawdownPct ?? 0}%`} />
      </div>
      <p className="text-xs cb-text-dim">{t("ft_backtest_note")}</p>
    </div>
  );
}

function SetupTab() {
  const { t } = useI18n();
  const steps = [
    { title: t("ft_setup_clone"), cmd: "git clone -b local-setup https://github.com/shinkang888-code/freqtrade.git" },
    { title: t("ft_setup_install"), cmd: "cd freqtrade && powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-local.ps1" },
    { title: t("ft_setup_start"), cmd: "powershell -ExecutionPolicy Bypass -File .\\scripts\\start-bot.ps1" },
  ];
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <div key={s.title} className="cb-panel p-4">
          <h4 className="text-sm font-semibold">{s.title}</h4>
          <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--cb-bg-deep)] p-3 text-[11px] cb-text-muted">
            {s.cmd}
          </pre>
        </div>
      ))}
      <div className="cb-panel p-4">
        <h4 className="text-sm font-semibold">{t("ft_setup_env")}</h4>
        <pre className="mt-2 overflow-x-auto rounded-md bg-[var(--cb-bg-deep)] p-3 text-[11px] cb-text-muted">
          {`FREQTRADE_API_URL=http://127.0.0.1:8080\nFREQTRADE_API_USER=freqtrader\nFREQTRADE_API_PASSWORD=freqtrader`}
        </pre>
        <p className="mt-2 text-xs cb-text-dim">{t("ft_setup_env_desc")}</p>
      </div>
    </div>
  );
}

function PairRow({ pair, online }: { pair: string; online: boolean }) {
  const sym = pair.replace("/USDT", "");
  return (
    <div className="cb-panel cb-row-hover flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(49,130,246,0.15)] text-xs font-bold text-[var(--cb-blue)]">
          {sym.slice(0, 2)}
        </div>
        <div>
          <p className="font-semibold">{sym}</p>
          <p className="text-xs cb-text-dim">USDT</p>
        </div>
      </div>
      <span className={cn("text-xs font-medium", online ? "cb-up" : "cb-text-dim")}>
        {online ? "●" : "—"}
      </span>
    </div>
  );
}

function TradeRow({ trade }: { trade: FtOpenTrade }) {
  const pct = trade.profitPct != null ? trade.profitPct * 100 : null;
  const up = (pct ?? 0) >= 0;
  return (
    <div className="cb-row-hover grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b cb-divider px-4 py-3 last:border-0 sm:grid-cols-[1fr_auto_auto_auto_auto]">
      <div>
        <p className="font-semibold">{trade.pair}</p>
        <p className="text-[11px] cb-text-dim">#{trade.tradeId}</p>
      </div>
      <span className="text-right text-sm tabular-nums">{trade.openRate.toLocaleString()}</span>
      <span className="hidden text-right text-sm tabular-nums sm:block">
        {trade.currentRate?.toLocaleString() ?? "—"}
      </span>
      <span className="text-right text-sm tabular-nums">{trade.stakeAmount.toFixed(2)}</span>
      <span className={cn("text-right text-sm font-bold tabular-nums", up ? "cb-up" : "cb-down")}>
        {pct != null ? `${up ? "+" : ""}${pct.toFixed(2)}%` : "—"}
      </span>
    </div>
  );
}

function LiveRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3.5">
      <span className="text-sm cb-text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  );
}

function StatCard({
  label,
  value,
  negative,
}: {
  label: string;
  value: string;
  negative?: boolean;
}) {
  return (
    <div className="cb-panel p-4">
      <p className="text-[11px] cb-text-dim">{label}</p>
      <p className={cn("mt-1 text-xl font-bold tabular-nums", negative && "cb-down")}>{value}</p>
    </div>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-2">
      <h3 className="text-base font-bold">{title}</h3>
      {subtitle ? <p className="text-xs cb-text-dim">{subtitle}</p> : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="cb-panel border-dashed py-12 text-center text-sm cb-text-muted">{text}</div>
  );
}

function ControlBtn({
  label,
  icon: Icon,
  busy,
  disabled,
  onClick,
  primary,
  danger,
}: {
  label: string;
  icon: typeof Play;
  busy?: boolean;
  disabled?: boolean;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "cb-action-btn inline-flex items-center gap-1.5",
        primary && "cb-action-primary",
        danger && "cb-action-danger",
      )}
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Icon className="h-3.5 w-3.5" />}
      {label}
    </button>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  BarChart3,
  Bot,
  Brain,
  ChevronRight,
  Download,
  FlaskConical,
  Globe,
  Loader2,
  Play,
  RefreshCw,
  Shield,
  Terminal,
  TrendingUp,
  Zap,
} from "lucide-react";

import { getCryptoBotDashboard, refreshCryptoBotLive } from "@/lib/api/ft.functions";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import type { FtDashboardSnapshot } from "@/lib/modules/ft/types";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CAPABILITY_ICONS = {
  bot: Bot,
  chart: BarChart3,
  flask: FlaskConical,
  brain: Brain,
  shield: Shield,
  globe: Globe,
} as const;

export function CryptoBotPanel() {
  const { t } = useI18n();
  const { accessToken, entitlements, enforced, isActive } = useAuth();
  const [snapshot, setSnapshot] = useState<FtDashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canExecute = !enforced || (isActive && Boolean(entitlements?.crypto_bot));

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getCryptoBotDashboard();
      setSnapshot(data);
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", t));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleRefresh = async () => {
    if (!canExecute) return;
    setRefreshing(true);
    setError(null);
    try {
      const live = await refreshCryptoBotLive({ data: { accessToken } });
      setSnapshot((prev) =>
        prev
          ? { ...prev, ...live }
          : {
              connection: live.connection,
              status: live.status,
              profit: live.profit,
              openTrades: live.openTrades,
              demoBacktest: {
                periodDays: 29,
                totalTrades: 30,
                winRate: 80,
                profitPct: -0.99,
                maxDrawdownPct: 1.12,
                pairs: ["BTC/USDT", "ETH/USDT"],
                strategy: "SampleStrategy",
              },
            },
      );
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", t));
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-hairline bg-surface">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const online = snapshot?.connection.online ?? false;
  const status = snapshot?.status;
  const profit = snapshot?.profit;
  const backtest = snapshot?.demoBacktest;

  return (
    <div className="space-y-6">
      {/* Status hero */}
      <section className="relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface via-surface to-primary/5 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <ConnectionBadge
              online={online}
              latencyMs={snapshot?.connection.latencyMs ?? null}
              label={online ? t("ft_status_online") : t("ft_status_offline")}
            />
            <h2 className="mt-4 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {online ? t("ft_hero_connected") : t("ft_hero_disconnected")}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {online ? t("ft_hero_connected_desc") : t("ft_hero_disconnected_desc")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-background px-4 py-2.5 text-sm font-medium transition hover:bg-muted/50"
            >
              <RefreshCw className="h-4 w-4" />
              {t("ft_btn_reload")}
            </button>
            {canExecute ? (
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
                {t("ft_btn_live_sync")}
              </button>
            ) : null}
          </div>
        </div>

        {online && status ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t("ft_metric_state")} value={status.state.toUpperCase()} accent />
            <MetricCard
              label={t("ft_metric_mode")}
              value={status.dryRun ? t("ft_mode_dry_run") : t("ft_mode_live")}
            />
            <MetricCard label={t("ft_metric_strategy")} value={status.strategy ?? "—"} />
            <MetricCard label={t("ft_metric_exchange")} value={status.exchange ?? "—"} />
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </section>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="h-auto flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="overview">{t("ft_tab_overview")}</TabsTrigger>
          <TabsTrigger value="capabilities">{t("ft_tab_capabilities")}</TabsTrigger>
          <TabsTrigger value="backtest">{t("ft_tab_backtest")}</TabsTrigger>
          <TabsTrigger value="monitor">{t("ft_tab_monitor")}</TabsTrigger>
          <TabsTrigger value="setup">{t("ft_tab_setup")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <WorkflowStep
              step={1}
              title={t("ft_flow_install")}
              desc={t("ft_flow_install_desc")}
              icon={Download}
            />
            <WorkflowStep
              step={2}
              title={t("ft_flow_backtest")}
              desc={t("ft_flow_backtest_desc")}
              icon={FlaskConical}
            />
            <WorkflowStep
              step={3}
              title={t("ft_flow_trade")}
              desc={t("ft_flow_trade_desc")}
              icon={Play}
            />
          </div>
          <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
            <h3 className="font-display text-lg font-semibold">{t("ft_overview_pairs")}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {(status?.pairWhitelist ?? backtest?.pairs ?? []).map((pair) => (
                <span
                  key={pair}
                  className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary"
                >
                  {pair}
                </span>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="capabilities">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              [
                { id: "dry_run", icon: "bot", tier: "free" },
                { id: "backtest", icon: "chart", tier: "free" },
                { id: "hyperopt", icon: "flask", tier: "premium" },
                { id: "freqai", icon: "brain", tier: "elite" },
                { id: "protection", icon: "shield", tier: "premium" },
                { id: "multi_exchange", icon: "globe", tier: "premium" },
              ] as const
            ).map((cap) => {
              const Icon = CAPABILITY_ICONS[cap.icon];
              return (
                <div
                  key={cap.id}
                  className="group rounded-2xl border border-hairline bg-surface p-5 transition hover:border-primary/30 hover:shadow-sm"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <TierBadge tier={cap.tier} t={t} />
                  </div>
                  <h3 className="font-semibold">{t(`ft_cap_${cap.id}_title` as never)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {t(`ft_cap_${cap.id}_desc` as never)}
                  </p>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="backtest">
          <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-lg font-semibold">{t("ft_backtest_title")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("ft_backtest_subtitle")}</p>
              </div>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {backtest?.strategy} · {backtest?.periodDays}d
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label={t("ft_bt_trades")} value={String(backtest?.totalTrades ?? 0)} />
              <MetricCard label={t("ft_bt_winrate")} value={`${backtest?.winRate ?? 0}%`} />
              <MetricCard
                label={t("ft_bt_profit")}
                value={`${backtest?.profitPct ?? 0}%`}
                negative={(backtest?.profitPct ?? 0) < 0}
              />
              <MetricCard label={t("ft_bt_drawdown")} value={`${backtest?.maxDrawdownPct ?? 0}%`} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">{t("ft_backtest_note")}</p>
          </div>
        </TabsContent>

        <TabsContent value="monitor">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t("ft_monitor_profit")}
              </h3>
              {online && profit ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <Row label={t("ft_profit_closed")} value={`${profit.profitClosedCoin.toFixed(2)} USDT`} />
                  <Row label={t("ft_profit_pct")} value={`${profit.profitClosedPercent.toFixed(2)}%`} />
                  <Row label={t("ft_profit_trades")} value={String(profit.tradeCount)} />
                  <Row
                    label={t("ft_profit_winrate")}
                    value={profit.winRate != null ? `${(profit.winRate * 100).toFixed(1)}%` : "—"}
                  />
                </dl>
              ) : (
                <OfflineHint t={t} apiUrl={snapshot?.connection.apiUrl} />
              )}
            </div>
            <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Zap className="h-5 w-5 text-primary" />
                {t("ft_monitor_positions")}
              </h3>
              {online && snapshot?.openTrades ? (
                <dl className="mt-4 space-y-3 text-sm">
                  <Row
                    label={t("ft_open_current")}
                    value={`${snapshot.openTrades.current} / ${snapshot.openTrades.max}`}
                  />
                  <Row label={t("ft_open_stake")} value={`${snapshot.openTrades.totalStake.toFixed(2)} USDT`} />
                  <Row label={t("ft_metric_timeframe")} value={status?.timeframe ?? "5m"} />
                  <Row label={t("ft_metric_stake")} value={`${status?.stakeAmount ?? 30} ${status?.stakeCurrency ?? "USDT"}`} />
                </dl>
              ) : (
                <OfflineHint t={t} apiUrl={snapshot?.connection.apiUrl} />
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="setup">
          <div className="space-y-4">
            <SetupBlock
              title={t("ft_setup_clone")}
              command="git clone -b local-setup https://github.com/shinkang888-code/freqtrade.git"
            />
            <SetupBlock
              title={t("ft_setup_install")}
              command="cd freqtrade && powershell -ExecutionPolicy Bypass -File .\\scripts\\setup-local.ps1"
            />
            <SetupBlock
              title={t("ft_setup_start")}
              command="powershell -ExecutionPolicy Bypass -File .\\scripts\\start-bot.ps1"
            />
            <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Terminal className="h-4 w-4 text-primary" />
                {t("ft_setup_env")}
              </h3>
              <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/50 p-4 text-xs leading-relaxed">
{`FREQTRADE_API_URL=http://127.0.0.1:8080
FREQTRADE_API_USER=freqtrader
FREQTRADE_API_PASSWORD=freqtrader`}
              </pre>
              <p className="mt-3 text-sm text-muted-foreground">{t("ft_setup_env_desc")}</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConnectionBadge({
  online,
  latencyMs,
  label,
}: {
  online: boolean;
  latencyMs: number | null;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-background/80 px-3 py-1.5 text-xs font-semibold backdrop-blur">
      <span className={cn("h-2 w-2 rounded-full", online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
      {label}
      {online && latencyMs != null ? (
        <span className="text-muted-foreground">· {latencyMs}ms</span>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent,
  negative,
}: {
  label: string;
  value: string;
  accent?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="rounded-xl border border-hairline bg-background/60 p-4">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 font-display text-xl font-bold",
          accent && "text-primary",
          negative && "text-destructive",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function WorkflowStep({
  step,
  title,
  desc,
  icon: Icon,
}: {
  step: number;
  title: string;
  desc: string;
  icon: typeof Bot;
}) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
          {step}
        </span>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}

function TierBadge({ tier, t }: { tier: string; t: (k: never) => string }) {
  return (
    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {tier === "free" ? t("ft_tier_free" as never) : tier === "premium" ? "Premium" : "Elite"}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline/60 pb-2 last:border-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}

function OfflineHint({ t, apiUrl }: { t: (k: never) => string; apiUrl?: string }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-hairline bg-muted/20 p-4 text-sm text-muted-foreground">
      <p>{t("ft_offline_hint" as never)}</p>
      {apiUrl ? (
        <p className="mt-2 font-mono text-xs">
          {apiUrl}
          <ChevronRight className="ml-1 inline h-3 w-3" />
        </p>
      ) : null}
    </div>
  );
}

function SetupBlock({ title, command }: { title: string; command: string }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <h3 className="font-semibold">{title}</h3>
      <pre className="mt-3 overflow-x-auto rounded-xl bg-muted/50 p-4 text-xs">{command}</pre>
    </div>
  );
}

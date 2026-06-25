import { useCallback, useEffect, useState } from "react";

import {
  controlCryptoBot,
  forceExitAllCryptoBot,
  getCryptoBotDashboard,
  getCryptoBotTrades,
  refreshCryptoBotLive,
} from "@/lib/api/ft.functions";
import {
  controlFtBotBrowser,
  fetchFtDashboardBrowser,
  fetchFtOpenTradesBrowser,
  forceExitAllFtBrowser,
  isMixedContentBlocked,
} from "@/lib/modules/ft/ft-client.browser";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { useI18n } from "@/lib/i18n";
import type {
  FtControlAction,
  FtDashboardSnapshot,
  FtOpenTrade,
} from "@/lib/modules/ft/types";
import { useAuth } from "@/lib/use-auth";

export type CryptoBotTab = "home" | "live" | "holdings" | "backtest" | "setup";

export function useCryptoBotEngine() {
  const { accessToken, entitlements, enforced, isActive } = useAuth();
  const { t: translate } = useI18n();

  const [snapshot, setSnapshot] = useState<FtDashboardSnapshot | null>(null);
  const [trades, setTrades] = useState<FtOpenTrade[]>([]);
  const [usedBrowser, setUsedBrowser] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [controlBusy, setControlBusy] = useState<FtControlAction | "forceexit" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<CryptoBotTab>("home");
  const [pairFilter, setPairFilter] = useState<string>("all");

  const canExecute = !enforced || (isActive && Boolean(entitlements?.crypto_bot));
  const mixedBlocked = isMixedContentBlocked();
  const localUiUrl = "http://localhost:5173/crypto-bot";

  const syncTrades = useCallback(
    async (viaBrowser: boolean) => {
      try {
        const list = viaBrowser
          ? await fetchFtOpenTradesBrowser()
          : await getCryptoBotTrades({ data: { accessToken } });
        setTrades(list);
      } catch {
        /* best-effort */
      }
    },
    [accessToken],
  );

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await getCryptoBotDashboard();
      if (data.connection.online) {
        setSnapshot(data);
        setUsedBrowser(false);
        void syncTrades(false);
      } else {
        const local = await fetchFtDashboardBrowser();
        if (local) {
          setSnapshot(local);
          setUsedBrowser(true);
          void syncTrades(true);
        } else {
          setSnapshot(data);
          setUsedBrowser(false);
        }
      }
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", translate));
    } finally {
      setLoading(false);
    }
  }, [syncTrades, translate]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!snapshot?.connection.online) return;
    const id = window.setInterval(() => void syncTrades(usedBrowser), 15_000);
    return () => window.clearInterval(id);
  }, [snapshot?.connection.online, usedBrowser, syncTrades]);

  const handleReload = async () => {
    setReloading(true);
    await load();
    setReloading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      let live = null as Awaited<ReturnType<typeof refreshCryptoBotLive>> | null;
      if (canExecute) {
        live = await refreshCryptoBotLive({ data: { accessToken } });
      }
      if (!live?.connection.online) {
        const browser = await fetchFtDashboardBrowser();
        if (browser) {
          setSnapshot(browser);
          setUsedBrowser(true);
          void syncTrades(true);
          return;
        }
      }
      if (live) {
        setUsedBrowser(false);
        void syncTrades(false);
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
      }
    } catch (e) {
      const browser = await fetchFtDashboardBrowser();
      if (browser) {
        setSnapshot(browser);
        setUsedBrowser(true);
      } else {
        setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", translate));
      }
    } finally {
      setRefreshing(false);
    }
  };

  const handleControl = async (action: FtControlAction) => {
    if (!canExecute && !usedBrowser) return;
    setControlBusy(action);
    setError(null);
    setNotice(null);
    try {
      const res = usedBrowser
        ? await controlFtBotBrowser(action)
        : await controlCryptoBot({ data: { accessToken, action } });
      if (res.ok) {
        setNotice(`${translate(`ft_ctrl_${action}` as never)} · ${res.message}`);
        await load();
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", translate));
    } finally {
      setControlBusy(null);
    }
  };

  const handleForceExit = async () => {
    if (!canExecute && !usedBrowser) return;
    if (!window.confirm(translate("ft_forceexit_confirm" as never))) return;
    setControlBusy("forceexit");
    setError(null);
    setNotice(null);
    try {
      const res = usedBrowser
        ? await forceExitAllFtBrowser()
        : await forceExitAllCryptoBot({ data: { accessToken } });
      if (res.ok) {
        setNotice(`${translate("ft_ctrl_forceexit" as never)} · ${res.message}`);
        await load();
      } else {
        setError(res.message);
      }
    } catch (e) {
      setError(formatFeatureError(e instanceof Error ? e.message : "ft_failed", translate));
    } finally {
      setControlBusy(null);
    }
  };

  const online = snapshot?.connection.online ?? false;
  const pairs = snapshot?.status?.pairWhitelist ?? snapshot?.demoBacktest.pairs ?? [];
  const filteredTrades =
    pairFilter === "all" ? trades : trades.filter((tr) => tr.pair === pairFilter);

  return {
    snapshot,
    trades: filteredTrades,
    allTrades: trades,
    pairs,
    loading,
    refreshing,
    reloading,
    controlBusy,
    error,
    notice,
    activeTab,
    setActiveTab,
    pairFilter,
    setPairFilter,
    online,
    canExecute,
    usedBrowser,
    mixedBlocked,
    localUiUrl,
    handleReload,
    handleRefresh,
    handleControl,
    handleForceExit,
    status: snapshot?.status,
    profit: snapshot?.profit,
    backtest: snapshot?.demoBacktest,
    openTrades: snapshot?.openTrades,
    connection: snapshot?.connection,
  };
}

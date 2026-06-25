import { useCallback, useEffect, useState } from "react";

import { getTossTraderDashboard, type TossTraderDashboardPayload } from "@/lib/api/toss-trader.functions";

const POLL_MS = 30_000;

export function useTossTraderDashboard(tossKey: string | null) {
  const [data, setData] = useState<TossTraderDashboardPayload | null>(null);
  const [loading, setLoading] = useState(Boolean(tossKey));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (silent = false) => {
    if (!tossKey) {
      setData(null);
      setLoading(false);
      return;
    }
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const payload = await getTossTraderDashboard({ data: { accessToken: tossKey } });
      setData(payload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch_failed");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tossKey]);

  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  useEffect(() => {
    if (!tossKey) return;
    const id = window.setInterval(() => void refresh(true), POLL_MS);
    return () => window.clearInterval(id);
  }, [tossKey, refresh]);

  return { data, loading, refreshing, error, refresh };
}

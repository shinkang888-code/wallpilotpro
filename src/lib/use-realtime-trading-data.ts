import { useCallback, useEffect, useState } from "react";

import { scanReverseQuant } from "@/lib/api/scan.functions";
import { getTossWallet } from "@/lib/api/toss.functions";
import type { ScanToggles, StockRow, TradingPayload } from "@/lib/types/stock";

export type { StockRow, TradingPayload, ScanToggles } from "@/lib/types/stock";

export function useRealtimeTradingData(opts: {
  tossKey: string | null;
  accessToken?: string | null;
  geminiApiKey?: string | null;
}) {
  const [data, setData] = useState<TradingPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(
    async (toggles: ScanToggles) => {
      setIsLoading(true);
      setError(null);
      try {
        const payload = await scanReverseQuant({
          data: {
            toggles,
            tossKey: opts.tossKey,
            accessToken: opts.accessToken ?? null,
            geminiApiKey: opts.geminiApiKey ?? undefined,
          },
        });
        setData(payload);
      } catch (e) {
        setError(e instanceof Error ? e.message : "scan_failed");
        setData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [opts.tossKey, opts.accessToken, opts.geminiApiKey],
  );

  useEffect(() => {
    if (!opts.tossKey) {
      setData((d) => (d ? { ...d, walletBalance: null } : d));
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const wallet = await getTossWallet({ data: { accessToken: opts.tossKey! } });
        if (cancelled) return;
        setData((d) => ({
          shortSqueeze: d?.shortSqueeze ?? [],
          highCash: d?.highCash ?? [],
          walletBalance: wallet,
        }));
      } catch {
        /* wallet sync optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [opts.tossKey]);

  return { data, isLoading, error, scan };
}

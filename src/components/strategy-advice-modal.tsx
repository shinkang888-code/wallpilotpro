import { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";

import { getStrategyAdvice } from "@/lib/api/strategy-advice.functions";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import type { StrategyAdvice } from "@/lib/types/chart";
import type { StockRow } from "@/lib/types/stock";

export function StrategyAdviceModal({
  row,
  onClose,
}: {
  row: StockRow | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const [advice, setAdvice] = useState<StrategyAdvice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [row, onClose]);

  useEffect(() => {
    if (!row) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAdvice(null);
    getStrategyAdvice({
      data: { row, accessToken, geminiApiKey: geminiApiKey ?? undefined },
    })
      .then((data) => {
        if (!cancelled) setAdvice(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "advice_failed");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row, accessToken, geminiApiKey]);

  if (!row) return null;

  const isUS = row.currency === "USD";
  const fmt = (n: number) =>
    isUS ? `$${n.toFixed(2)}` : `₩${Math.round(n).toLocaleString("ko-KR")}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h3 className="font-display text-lg font-semibold">{t("strategy_title")}</h3>
            <p className="text-sm text-muted-foreground">
              {row.name} ({row.ticker}) · Gemini + 3M volume
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-surface">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5">
          {loading && (
            <div className="flex h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              {t("strategy_loading")}
            </div>
          )}
          {error && (
            <p className="rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}
          {advice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-hairline bg-surface p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("strategy_floor")}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-destructive tabular-nums">
                    {fmt(advice.priceFloor30d)}
                  </p>
                </div>
                <div className="rounded-xl border border-hairline bg-surface p-3">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {t("strategy_ceiling")}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold text-positive tabular-nums">
                    {fmt(advice.priceCeiling30d)}
                  </p>
                </div>
              </div>

              <section className="rounded-xl border border-hairline bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("strategy_volume")}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{advice.volumeInsight}</p>
                <p className="mt-1 text-xs text-muted-foreground">{advice.recentVolumeTrend}</p>
              </section>

              <section className="rounded-xl border border-primary/20 bg-primary/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-positive">
                  {t("strategy_buy")}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{advice.buyTiming}</p>
              </section>

              <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-destructive">
                  {t("strategy_sell")}
                </p>
                <p className="mt-2 text-sm leading-relaxed">{advice.sellTiming}</p>
              </section>

              <p className="text-xs leading-relaxed text-muted-foreground">{advice.summary}</p>
              <p className="text-[10px] text-muted-foreground">{t("strategy_disclaimer")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

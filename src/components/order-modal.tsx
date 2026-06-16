import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { RatingBadge } from "@/components/rating-badge";
import { evaluateRiskGate } from "@/lib/api/risk-gate.functions";
import { useI18n } from "@/lib/i18n";
import { computeOrderQty } from "@/lib/order-sizing";
import { isBearishRating } from "@/lib/types/rating";
import type { RiskGateResult } from "@/lib/types/agent";
import type { StockRow } from "@/lib/types/stock";

export function OrderModal({
  row,
  walletBalance,
  onClose,
  onConfirm,
}: {
  row: StockRow | null;
  walletBalance: { krw: number; usd: number } | null;
  onClose: () => void;
  onConfirm: (row: StockRow, qty: number) => void;
}) {
  const { t } = useI18n();
  const [riskGate, setRiskGate] = useState<RiskGateResult | null>(null);
  const [riskLoading, setRiskLoading] = useState(false);

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
    if (!row) {
      setRiskGate(null);
      return;
    }
    let cancelled = false;
    setRiskLoading(true);
    evaluateRiskGate({ data: { row, wallet: walletBalance } })
      .then((result) => {
        if (!cancelled) setRiskGate(result);
      })
      .catch(() => {
        if (!cancelled) setRiskGate(null);
      })
      .finally(() => {
        if (!cancelled) setRiskLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [row, walletBalance]);

  if (!row) return null;

  const qty = computeOrderQty(row, walletBalance);
  const bearish = isBearishRating(row.rating);
  const blocked = riskGate != null && !riskGate.approved;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl bg-background shadow-2xl"
      >
        <div className="px-6 pt-6">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-display text-lg font-semibold tracking-tight text-foreground">
              {t("modal_title")}
            </h3>
            <RatingBadge rating={row.rating} />
          </div>

          {riskLoading && (
            <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("risk_gate_loading")}
            </p>
          )}

          {riskGate && (
            <div className="mt-3 space-y-2 rounded-2xl border border-hairline bg-surface p-4 text-xs">
              <p className="font-semibold text-foreground">{t("risk_gate_title")}</p>
              <p>
                <span className="font-medium text-positive">{t("risk_aggressive")}: </span>
                {riskGate.aggressiveView}
              </p>
              <p>
                <span className="font-medium text-destructive">{t("risk_conservative")}: </span>
                {riskGate.conservativeView}
              </p>
              <p className={riskGate.approved ? "text-positive" : "text-destructive"}>
                {riskGate.reason}
              </p>
            </div>
          )}

          {(bearish || blocked) && (
            <p className="mt-3 rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {blocked ? t("risk_gate_blocked") : t("modal_rating_warning")}
            </p>
          )}

          <p className="mt-3 rounded-2xl bg-surface p-4 text-sm leading-relaxed text-foreground">
            <span className="font-semibold text-primary">{t("modal_breakdown")} </span>
            <span className="font-display font-semibold tabular-nums">{qty} </span>
            <span>{t("modal_shares")} </span>
            <span className="font-display font-semibold">{row.ticker}</span>
            <span> ({row.buyingZone}) </span>
            <span className="text-muted-foreground">{t("modal_route")}</span>
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t border-hairline px-4 py-3">
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground transition-all duration-200 active:scale-[0.97] hover:text-foreground"
          >
            {t("cancel")}
          </button>
          <button
            onClick={() => onConfirm(row, qty)}
            disabled={riskLoading || blocked}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 active:scale-[0.97] disabled:opacity-40"
          >
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}

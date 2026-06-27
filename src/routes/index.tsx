import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { LandingFaq } from "@/components/marketing/landing-faq";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingValueProps } from "@/components/marketing/landing-value-props";
import { ScannerPreviewBanner } from "@/components/marketing/scanner-preview-banner";
import { ScannerControl } from "@/components/scanner-control";
import { StockMatrix } from "@/components/stock-matrix";
import { OrderModal } from "@/components/order-modal";
import { MarketShowcase } from "@/components/market-showcase";
import { formatFeatureError } from "@/lib/auth/format-feature-error";
import { logOrderDecision } from "@/lib/api/order-log.functions";
import { executeSplitLimitOrder } from "@/lib/api/toss.functions";
import { useI18n } from "@/lib/i18n";
import { LANDING_SEO } from "@/lib/marketing/landing-copy";
import { parseBuyingZoneBounds } from "@/lib/order-sizing";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { useRealtimeTradingData, type StockRow } from "@/lib/use-realtime-trading-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: LANDING_SEO.title.ko },
      { name: "description", content: LANDING_SEO.description.ko },
      { name: "keywords", content: LANDING_SEO.keywords.ko },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { t } = useI18n();
  const { key } = useTossApiKey();
  const auth = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const { data, isLoading, error, scan } = useRealtimeTradingData({
    tossKey: key,
    accessToken: auth.accessToken,
    geminiApiKey,
  });

  const [toggles, setToggles] = useState({ toss: true, thirteenF: true, quant: false });
  const [selected, setSelected] = useState<string | null>(null);
  const [orderRow, setOrderRow] = useState<StockRow | null>(null);

  const canScan =
    !auth.enforced ||
    (Boolean(auth.accessToken) && auth.isActive && Boolean(auth.entitlements?.scan));

  const scannerRef = useRef<HTMLDivElement>(null);
  const didAutoScan = useRef(false);

  const scrollToScanner = () => {
    scannerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {
    if (auth.loading || didAutoScan.current || !canScan) return;
    didAutoScan.current = true;
    void scan(toggles);
  }, [auth.loading, canScan, scan, toggles]);

  const handleScan = () => {
    if (auth.loading) return;
    if (auth.enforced && !auth.accessToken) {
      toast.error(t("auth_sign_in_first"));
      return;
    }
    if (auth.enforced && auth.isPending) {
      toast.error(t("auth_notice_pending"));
      return;
    }
    if (auth.enforced && !auth.entitlements?.scan) {
      toast.error(t("auth_err_need_basic"));
      return;
    }
    void scan(toggles);
  };

  const handleConfirmOrder = async (row: StockRow, qty: number) => {
    if (!key) {
      toast.error(t("toss_disconnected"));
      return;
    }
    const { low, high } = parseBuyingZoneBounds(row.buyingZone, row.currency);
    try {
      const result = await executeSplitLimitOrder({
        data: {
          accessToken: key,
          authAccessToken: auth.accessToken,
          ticker: row.ticker,
          market: row.market,
          totalQty: qty,
          zoneLow: low,
          zoneHigh: high,
        },
      });
      if (result.ok) {
        toast.success(t("toast_success"));
        void logOrderDecision({ data: { row, orderOk: true } });
      } else {
        toast.error(result.message);
        void logOrderDecision({ data: { row, orderOk: false } });
      }
    } catch {
      toast.error(t("toss_disconnected"));
    }
    setOrderRow(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={data?.walletBalance ?? null} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <AuthNoticeBanner feature="scan" className="mb-6" />
        <ScannerPreviewBanner />

        <LandingHero onPreviewScan={scrollToScanner} className="mb-8 sm:mb-10" />
        <LandingValueProps className="mb-10 sm:mb-12" />

        <div id="scanner" ref={scannerRef} className="scroll-mt-24">
        <ScannerControl
          isLoading={isLoading || auth.loading}
          scanDisabled={!canScan}
          onScan={handleScan}
          toggles={toggles}
          setToggles={setToggles}
        />
        </div>

        <div className="mt-10 sm:mt-14">
          <MarketShowcase />
        </div>

        <div className="mt-10 sm:mt-14">
          <div className="mb-5 flex items-center gap-2">
            <span className="h-px w-6 bg-foreground/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
              Live Signals
            </span>
          </div>
          {error && (
            <p className="mb-4 rounded-xl border border-destructive/30 bg-red-50 px-4 py-3 text-sm text-destructive">
              {formatFeatureError(error, t)}
            </p>
          )}
          <StockMatrix
            isLoading={isLoading}
            hasScanned={data !== null}
            shortSqueeze={data?.shortSqueeze ?? []}
            highCash={data?.highCash ?? []}
            selectedTicker={selected}
            onSelect={setSelected}
            onExecute={(row) => {
              if (!key) {
                toast.error(t("toss_disconnected"));
                return;
              }
              setOrderRow(row);
            }}
          />
        </div>

        <div className="mt-12">
          <LandingFaq />
        </div>
      </main>

      <OrderModal
        row={orderRow}
        walletBalance={data?.walletBalance ?? null}
        onClose={() => setOrderRow(null)}
        onConfirm={handleConfirmOrder}
      />
    </div>
  );
}

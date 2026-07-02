import { createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { WallStreetReportPanel } from "@/components/wall-street-report-panel";
import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useRealtimeTradingData } from "@/lib/use-realtime-trading-data";
import { useTossApiKey } from "@/lib/use-toss-api-key";

export const Route = createFileRoute("/wall-street-report")({
  validateSearch: (search: Record<string, unknown>) => ({
    symbol: typeof search.symbol === "string" ? search.symbol : undefined,
  }),
  head: () => ({
    meta: [
      { title: "WallPilot — 월가리포트" },
      {
        name: "description",
        content: "Lynch GARP, Greenblatt Magic Formula, and institutional supply-demand analysis.",
      },
    ],
  }),
  component: WallStreetReportPage,
});

function WallStreetReportPage() {
  const { t } = useI18n();
  const { symbol } = Route.useSearch();
  const { key } = useTossApiKey();
  const auth = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const { data } = useRealtimeTradingData({
    tossKey: key,
    accessToken: auth.accessToken,
    geminiApiKey,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={data?.walletBalance ?? null} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <AuthNoticeBanner feature="wall_report" className="mb-6" />

        <section className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              Lynch · Greenblatt · Supply
            </span>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-foreground sm:text-[48px]">
            {t("ws_title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("ws_subtitle")}</p>
        </section>

        <WallStreetReportPanel initialSymbol={symbol} />
      </main>
    </div>
  );
}

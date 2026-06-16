import { createFileRoute } from "@tanstack/react-router";

import { AiPilotChat } from "@/components/ai-pilot-chat";
import { Header } from "@/components/header";
import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useRealtimeTradingData } from "@/lib/use-realtime-trading-data";
import { useTossApiKey } from "@/lib/use-toss-api-key";

export const Route = createFileRoute("/ai-pilot")({
  head: () => ({
    meta: [
      { title: "WallPilot — AI Pilot" },
      {
        name: "description",
        content: "WallPilot AI-powered reverse-quant copilot — stock picks, rankings, and execution guides.",
      },
    ],
  }),
  component: AiPilotPage,
});

function AiPilotPage() {
  const { t } = useI18n();
  const { key } = useTossApiKey();
  const auth = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const { data, isLoading, error, scan } = useRealtimeTradingData({
    tossKey: key,
    accessToken: auth.accessToken,
    geminiApiKey,
  });

  const scanContext =
    data && (data.shortSqueeze.length > 0 || data.highCash.length > 0)
      ? { shortSqueeze: data.shortSqueeze, highCash: data.highCash }
      : null;

  const runScan = () => {
    void scan({ toss: true, thirteenF: true, quant: false });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={data?.walletBalance ?? null} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <AuthNoticeBanner feature="ai_pilot" className="mb-6" />

        <section className="mb-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              WallPilot AI · Reverse-Quant
            </span>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-foreground sm:text-[44px]">
            {t("pilot_title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t("pilot_subtitle")}
          </p>
        </section>

        <AiPilotChat
          scanContext={scanContext}
          scanData={data}
          scanLoading={isLoading}
          scanError={error}
          onRunScan={runScan}
        />
      </main>
    </div>
  );
}

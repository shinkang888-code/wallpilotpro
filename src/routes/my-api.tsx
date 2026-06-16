import { createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { VercelConnectPanel } from "@/components/vercel-connect-panel";
import { GeminiConnectPanel } from "@/components/gemini-connect-panel";
import { GoogleAuthConnectPanel } from "@/components/google-auth-connect-panel";
import { SupabaseConnectPanel } from "@/components/supabase-connect-panel";
import { TossApiPanel } from "@/components/toss-api-panel";
import { useI18n } from "@/lib/i18n";
import { canManagePlatformApis } from "@/lib/my-api-access";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useRealtimeTradingData } from "@/lib/use-realtime-trading-data";
import { useTossApiKey } from "@/lib/use-toss-api-key";

export const Route = createFileRoute("/my-api")({
  head: () => ({
    meta: [
      { title: "WallPilot — My API" },
      {
        name: "description",
        content: "Connect Vercel, Toss Open API, Supabase, Gemini, and Google Auth for WallPilot.",
      },
    ],
  }),
  component: MyApiPage,
});

function MyApiPage() {
  const { t } = useI18n();
  const { key } = useTossApiKey();
  const auth = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const isPlatformOwner = !auth.loading && canManagePlatformApis(auth.user?.email);
  const { data } = useRealtimeTradingData({
    tossKey: key,
    accessToken: auth.accessToken,
    geminiApiKey,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={data?.walletBalance ?? null} />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mb-8 sm:mb-10">
          <div className="mb-3 flex items-center gap-2">
            <span className="h-px w-6 bg-primary" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
              API Keys
            </span>
          </div>
          <h1 className="font-display text-[32px] font-bold leading-tight tracking-tight text-foreground sm:text-[44px]">
            {t("my_api_title")}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {t(isPlatformOwner ? "my_api_subtitle" : "my_api_subtitle_toss_only")}
          </p>
        </section>

        <div className="flex flex-col gap-6">
          {isPlatformOwner && <VercelConnectPanel />}
          <TossApiPanel />
          {isPlatformOwner && (
            <>
              <SupabaseConnectPanel />
              <GeminiConnectPanel />
              <GoogleAuthConnectPanel />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { CryptoBotPanel } from "@/components/modules/crypto-bot-panel";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/crypto-bot/")({
  component: CryptoBotPage,
});

function CryptoBotPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <MenuGate menuId="crypto_bot" action="view">
          <AuthNoticeBanner feature="crypto_bot" className="mb-6" />
          <section className="mb-8">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-primary">
              ft.* · Freqtrade Engine
            </p>
            <h1 className="mt-2 font-display text-[32px] font-bold tracking-tight sm:text-[40px]">
              {t("module_crypto_bot_title")}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              {t("module_crypto_bot_body")}
            </p>
          </section>
          <CryptoBotPanel />
        </MenuGate>
      </main>
    </div>
  );
}

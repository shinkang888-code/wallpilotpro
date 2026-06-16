import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { SignalHubPanel } from "@/components/modules/signal-hub-panel";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/signals/")({
  component: SignalHubPage,
});

function SignalHubPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <MenuGate menuId="signal_hub" action="view">
          <AuthNoticeBanner feature="signals_read" className="mb-6" />
          <section className="mb-8">
            <h1 className="font-display text-[32px] font-bold tracking-tight">{t("module_signal_hub_title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("module_signal_hub_body")}</p>
          </section>
          <SignalHubPanel />
        </MenuGate>
      </main>
    </div>
  );
}

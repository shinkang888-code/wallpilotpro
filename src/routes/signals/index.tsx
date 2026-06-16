import { createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";
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
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <MenuGate menuId="signal_hub" action="view">
          <div className="rounded-2xl border border-hairline bg-white p-8">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Phase 3 · ait.*
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold">{t("module_signal_hub_title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("module_signal_hub_body")}</p>
          </div>
        </MenuGate>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { RlLabPanel } from "@/components/modules/rl-lab-panel";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/quant/rl-lab")({
  component: RlLabPage,
});

function RlLabPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <MenuGate menuId="rl_lab" action="execute">
          <AuthNoticeBanner feature="rl_lab" className="mb-6" />
          <section className="mb-8">
            <h1 className="font-display text-[32px] font-bold tracking-tight">{t("module_rl_lab_title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("module_rl_lab_body")}</p>
          </section>
          <RlLabPanel />
        </MenuGate>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { DartLabPanel } from "@/components/modules/dartlab-panel";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/dartlab/")({
  validateSearch: (search: Record<string, unknown>) => ({
    code: typeof search.code === "string" ? search.code : undefined,
  }),
  component: DartLabPage,
});

function DartLabPage() {
  const { t } = useI18n();
  const { code } = Route.useSearch();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <MenuGate menuId="dart_lab" action="view">
          <AuthNoticeBanner feature="dart_lab" className="mb-6" />
          <section className="mb-8">
            <h1 className="font-display text-[32px] font-bold tracking-tight">{t("module_dartlab_title")}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("module_dartlab_body")}</p>
          </section>
          <DartLabPanel initialCode={code} />
        </MenuGate>
      </main>
    </div>
  );
}

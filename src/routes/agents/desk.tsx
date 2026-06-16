import { createFileRoute } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/agents/desk")({
  component: AgentDeskPage,
});

function AgentDeskPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <MenuGate menuId="agent_desk" action="execute">
          <div className="rounded-2xl border border-hairline bg-white p-8">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">
              Phase 2 · ta.*
            </span>
            <h1 className="mt-4 font-display text-2xl font-bold">{t("module_agent_desk_title")}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{t("module_agent_desk_body")}</p>
          </div>
        </MenuGate>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";

import { AgentDeskDashboard } from "@/components/agent-desk/agent-desk-dashboard";
import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/agents/desk")({
  component: AgentDeskPage,
  head: () => ({
    meta: [
      { title: "WallPilot — Agent Desk" },
      {
        name: "description",
        content:
          "AI 증권사 가상 오피스 — 부서별 AI 팀장, 실무 담당, 업무 보고, 실시간 활동 모니터링",
      },
    ],
  }),
});

function AgentDeskPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-7xl">
        <MenuGate menuId="agent_desk" action="view">
          <div className="sm:mx-4 sm:mt-4 sm:rounded-2xl sm:bg-white sm:shadow-sm">
            <AuthNoticeBanner feature="agent_desk" className="mx-4 mb-4 mt-4 sm:mx-6 sm:mt-6" />

            <div className="hidden px-6 pb-2 pt-2 sm:block">
              <p className="text-xs font-semibold text-[#3182f6]">WallPilot AI Office</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#191f28]">
                {t("nav_agent_desk")}
              </h1>
              <p className="mt-1 text-sm text-[#6b7684]">{t("module_agent_desk_body")}</p>
            </div>

            <AgentDeskDashboard />
          </div>
        </MenuGate>
      </main>
    </div>
  );
}

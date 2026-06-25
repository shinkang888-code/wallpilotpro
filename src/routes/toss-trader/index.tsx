import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { Header } from "@/components/header";
import { MenuGate } from "@/components/menu-gate";
import { TossTraderDashboard } from "@/components/toss-trader/toss-trader-dashboard";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/toss-trader/")({
  component: TossTraderPage,
  head: () => ({
    meta: [
      { title: "WallPilot — 토스 트레이더" },
      {
        name: "description",
        content: "토스증권 보유 주식 · 미체결 주문 · 크립토 봇 분석을 한 화면에서 — 트레이더 통합 대시보드",
      },
    ],
  }),
});

function TossTraderPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-6xl px-0 py-0 sm:px-4 sm:py-6">
        <MenuGate menuId="toss_trader" action="view">
          <div className="sm:rounded-2xl sm:bg-white sm:p-1 sm:shadow-sm">
            <AuthNoticeBanner feature="toss_trader" className="mx-4 mb-4 mt-4 sm:mx-6 sm:mt-6" />

            <div className="hidden px-6 pb-2 pt-2 sm:block">
              <p className="text-xs font-semibold text-[#3182f6]">{t("tt_brand")}</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#191f28]">
                {t("module_toss_trader_title")}
              </h1>
              <p className="mt-1 text-sm text-[#6b7684]">{t("tt_page_subtitle")}</p>
            </div>

            <TossTraderDashboard />
          </div>
        </MenuGate>
      </main>
    </div>
  );
}

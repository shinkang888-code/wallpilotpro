import { createFileRoute } from "@tanstack/react-router";

import { AuthNoticeBanner } from "@/components/auth-notice-banner";
import { CryptoBotTossDashboard } from "@/components/crypto-bot/crypto-bot-toss-dashboard";
import { Header } from "@/components/header";
import { MenuGate } from "@/components/menu-gate";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/crypto-bot/")({
  component: CryptoBotPage,
  head: () => ({
    meta: [
      { title: "WallPilot — 크립토 봇" },
      {
        name: "description",
        content: "Freqtrade 자동매매 엔진 — 토스증권 스타일 실시간 모니터링 & 봇 제어",
      },
    ],
  }),
});

function CryptoBotPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-[#f2f4f6]">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-3xl px-0 py-0 sm:px-4 sm:py-6">
        <MenuGate menuId="crypto_bot" action="view">
          <div className="sm:rounded-2xl sm:bg-white sm:p-1 sm:shadow-sm">
            <AuthNoticeBanner feature="crypto_bot" className="mx-4 mb-4 mt-4 sm:mx-6 sm:mt-6" />

            {/* Toss-style page intro — light shell wrapping dark instrument panel */}
            <div className="hidden px-6 pb-2 pt-2 sm:block">
              <p className="text-xs font-semibold text-[#3182f6]">{t("ft_ui_brand")}</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-tight text-[#191f28]">
                {t("module_crypto_bot_title")}
              </h1>
              <p className="mt-1 text-sm text-[#6b7684]">{t("ft_ui_page_subtitle")}</p>
            </div>

            <CryptoBotTossDashboard />
          </div>
        </MenuGate>
      </main>
    </div>
  );
}

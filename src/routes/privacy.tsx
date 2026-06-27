// filepath: src/routes/privacy.tsx
import { createFileRoute, Link } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "개인정보처리방침 | WallPilot Pro" },
      { name: "description", content: "WallPilot Pro 개인정보 처리방침 — Terrabridge Capital Inc." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useI18n();
  const locale = lang === "ko" ? "ko" : "en";

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Link to="/" className="text-xs font-medium text-primary hover:underline">
          ← WallPilot Pro
        </Link>
        <div className="mt-6">
          <PrivacyContent locale={locale} />
        </div>
      </main>
    </div>
  );
}

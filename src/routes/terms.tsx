// filepath: src/routes/terms.tsx
import { createFileRoute, Link } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { TermsContent } from "@/components/legal/terms-content";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "이용약관 | WallPilot Pro" },
      {
        name: "description",
        content: "WallPilot Pro 이용약관 — Terrabridge Capital Inc.",
      },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
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
          <TermsContent locale={locale} />
        </div>
      </main>
    </div>
  );
}

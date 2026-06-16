import { createFileRoute, Link } from "@tanstack/react-router";

import { Header } from "@/components/header";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/pending")({
  component: PendingPage,
});

function PendingPage() {
  const { t } = useI18n();
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-lg px-4 py-16 text-center sm:px-6">
        <h1 className="font-display text-2xl font-bold text-foreground">{t("pending_title")}</h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{t("pending_body")}</p>
        {auth.user && (
          <p className="mt-2 text-xs text-muted-foreground">{auth.user.email}</p>
        )}
        <Link
          to="/"
          className="mt-8 inline-block rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
        >
          {t("pending_back")}
        </Link>
      </main>
    </div>
  );
}

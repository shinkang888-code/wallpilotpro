import { createFileRoute } from "@tanstack/react-router";
import { Shield } from "lucide-react";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminSecurityPanel } from "@/components/admin/admin-security-panel";
import { Header } from "@/components/header";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin/security")({
  component: AdminSecurityPage,
});

function AdminSecurityPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const showPanel = auth.isStaff && auth.accessToken;

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{t("admin_security_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin_security_subtitle")}</p>
          </div>
        </div>
        <AdminGate />
        {showPanel && (
          <>
            <AdminNav />
            <AdminSecurityPanel accessToken={auth.accessToken!} />
          </>
        )}
      </main>
    </div>
  );
}

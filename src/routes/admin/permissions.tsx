import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";

import { AdminGate } from "@/components/admin/admin-gate";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminPermissionsTable } from "@/components/admin/admin-permissions-table";
import { Header } from "@/components/header";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/admin/permissions")({
  component: AdminPermissionsPage,
});

function AdminPermissionsPage() {
  const { t } = useI18n();
  const auth = useAuth();
  const showPanel = auth.isAdmin && auth.accessToken;

  return (
    <div className="min-h-screen bg-background">
      <Header walletBalance={null} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
            <KeyRound className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold">{t("admin_permissions_title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("admin_permissions_subtitle")}</p>
          </div>
        </div>
        <AdminGate />
        {showPanel && (
          <>
            <AdminNav />
            <AdminPermissionsTable accessToken={auth.accessToken!} />
          </>
        )}
      </main>
    </div>
  );
}

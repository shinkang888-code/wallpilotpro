import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";

import { useI18n } from "@/lib/i18n";
import { APP_MENUS, type AppMenuId } from "@/lib/membership/menus";
import { canAccessMenu } from "@/lib/membership/menu-access";
import { minTierLabel, type MembershipTier } from "@/lib/membership/tiers";
import { useAuth } from "@/lib/use-auth";

export function MenuGate({
  menuId,
  action = "view",
  children,
}: {
  menuId: AppMenuId;
  action?: "view" | "execute" | "export_pdf";
  children: ReactNode;
}) {
  const auth = useAuth();
  const { t, lang } = useI18n();
  const tier = auth.membershipTier;
  const allowed = canAccessMenu(menuId, tier, action, [], auth.isAdmin);

  if (allowed) return <>{children}</>;

  const menu = APP_MENUS.find((m) => m.id === menuId);
  const requiredTier: MembershipTier = menu?.defaultMinTier ?? "day_trading";

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
        <Lock className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="font-display text-xl font-bold text-foreground">{t("menu_gate_title")}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("menu_gate_body").replace("{tier}", minTierLabel(requiredTier, lang))}
      </p>
      <Link
        to="/pricing"
        className="mt-6 rounded-xl bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
      >
        {t("menu_gate_cta")}
      </Link>
    </div>
  );
}

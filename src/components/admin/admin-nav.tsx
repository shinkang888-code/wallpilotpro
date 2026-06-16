import { Link, useRouterState } from "@tanstack/react-router";
import { Activity, KeyRound, Shield, Users } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ADMIN_TABS = [
  { to: "/admin", labelKey: "admin_nav_members", icon: Users, exact: true },
  { to: "/admin/permissions", labelKey: "admin_nav_permissions", icon: KeyRound, exact: false },
  { to: "/admin/activity", labelKey: "admin_nav_activity", icon: Activity, exact: false },
  { to: "/admin/security", labelKey: "admin_nav_security", icon: Shield, exact: false },
] as const;

export function AdminNav() {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="mb-6 flex flex-wrap gap-2 border-b border-hairline pb-4">
      {ADMIN_TABS.map(({ to, labelKey, icon: Icon }) => {
        const isActive = to === "/admin" ? pathname === "/admin" || pathname === "/admin/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
              isActive ? "bg-foreground text-background" : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {t(labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

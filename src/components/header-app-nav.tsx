import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { APP_MENUS } from "@/lib/membership/menus";
import { cn } from "@/lib/utils";

export function HeaderAppNav({
  pathname,
  canViewMenu,
  showAdmin,
}: {
  pathname: string;
  canViewMenu: (menuId: (typeof APP_MENUS)[number]["id"]) => boolean;
  showAdmin: boolean;
}) {
  const { t } = useI18n();

  return (
    <nav
      className="flex items-center gap-0.5 overflow-x-auto scrollbar-none"
      aria-label="Main"
    >
      {APP_MENUS.map((menu, index) => {
        const active =
          menu.path === "/" ? pathname === "/" : pathname.startsWith(menu.path);
        const locked = !canViewMenu(menu.id);
        const prevNamespace = index > 0 ? APP_MENUS[index - 1]!.namespace : menu.namespace;
        const showDivider = index > 0 && menu.namespace !== prevNamespace && menu.namespace !== "";

        return (
          <span key={menu.id} className="flex shrink-0 items-center">
            {showDivider ? (
              <span className="mx-1 hidden h-4 w-px bg-hairline xl:block" aria-hidden />
            ) : null}
            <NavItem
              to={menu.path}
              active={active}
              locked={locked}
              label={t(menu.labelKey)}
            />
          </span>
        );
      })}
      {showAdmin ? (
        <>
          <span className="mx-1 hidden h-4 w-px bg-hairline xl:block" aria-hidden />
          <NavItem
            to="/admin"
            active={pathname.startsWith("/admin")}
            label={t("nav_admin")}
          />
        </>
      ) : null}
    </nav>
  );
}

function NavItem({
  to,
  active,
  label,
  locked,
}: {
  to: string;
  active: boolean;
  label: string;
  locked?: boolean;
}) {
  return (
    <Link
      to={to}
      title={label}
      className={cn(
        "relative inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[13px] font-medium leading-none transition-colors",
        "sm:px-3",
        active
          ? "bg-foreground/[0.06] text-foreground after:absolute after:inset-x-2 after:bottom-0.5 after:h-[2px] after:rounded-full after:bg-primary"
          : "text-muted-foreground hover:bg-surface hover:text-foreground",
        locked && !active && "opacity-55",
      )}
    >
      {locked ? <Lock className="h-3 w-3 shrink-0" aria-hidden /> : null}
      <span>{label}</span>
    </Link>
  );
}

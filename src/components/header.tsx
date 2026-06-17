import { Link, useRouterState } from "@tanstack/react-router";
import { ExternalLink, Lock } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { LanguageScrollSelector } from "@/components/language-scroll-selector";
import { pickLocaleString } from "@/components/language-scroll-selector";
import { useI18n } from "@/lib/i18n";
import { APP_MENUS } from "@/lib/membership/menus";
import { canAccessMenu } from "@/lib/membership/menu-access";
import { tierDefinition } from "@/lib/membership/tiers";
import { useAuth } from "@/lib/use-auth";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { cn } from "@/lib/utils";

const TOSS_INVEST_URL = "https://www.tossinvest.com/";

export function Header({ walletBalance }: { walletBalance: { krw: number; usd: number } | null }) {
  const { t, lang } = useI18n();
  const { isConnected } = useTossApiKey();
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const tierBadge = pickLocaleString(tierDefinition(auth.membershipTier).name, lang);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-hairline bg-background/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex min-w-0 items-center gap-6">
          <Link to="/" className="flex min-w-0 flex-col leading-tight">
            <span className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
              WallPilot Pro
            </span>
            <span className="mt-0.5 flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 shrink-0 rounded-full",
                  isConnected ? "bg-positive shadow-[0_0_8px_rgba(0,181,122,0.7)]" : "bg-muted-foreground/40",
                )}
              />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                {tierBadge}
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex">
            {APP_MENUS.map((menu) => (
              <NavLink
                key={menu.id}
                to={menu.path}
                active={menu.path === "/" ? pathname === "/" : pathname.startsWith(menu.path)}
                label={t(menu.labelKey)}
                locked={!canAccessMenu(menu.id, auth.membershipTier, "view", [], auth.isAdmin)}
              />
            ))}
            {auth.isStaff && (
              <NavLink to="/admin" active={pathname.startsWith("/admin")} label={t("nav_admin")} />
            )}
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <BalanceWidget balance={walletBalance} />
          <TossExternalLink />
          <AuthButton />
          <LanguageScrollSelector />
        </div>
      </div>

      <nav className="flex overflow-x-auto border-t border-hairline px-2 py-2 lg:hidden">
        {APP_MENUS.map((menu) => (
          <NavLink
            key={menu.id}
            to={menu.path}
            active={menu.path === "/" ? pathname === "/" : pathname.startsWith(menu.path)}
            label={t(menu.labelKey)}
            mobile
            locked={!canAccessMenu(menu.id, auth.membershipTier, "view", [], auth.isAdmin)}
          />
        ))}
        {auth.isStaff && (
          <NavLink to="/admin" active={pathname.startsWith("/admin")} label={t("nav_admin")} mobile />
        )}
        <TossExternalLink mobile />
      </nav>
    </header>
  );
}

function NavLink({
  to,
  active,
  label,
  mobile,
  locked,
}: {
  to: string;
  active: boolean;
  label: string;
  mobile?: boolean;
  locked?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors",
        mobile && "shrink-0 px-2",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-surface hover:text-foreground",
        locked && !active && "opacity-60",
      )}
    >
      {locked && <Lock className="h-3 w-3" />}
      {label}
    </Link>
  );
}

function TossExternalLink({ mobile }: { mobile?: boolean }) {
  const { t } = useI18n();

  return (
    <a
      href={TOSS_INVEST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5",
        mobile && "shrink-0",
      )}
      aria-label={t("nav_toss_aria")}
    >
      {t("nav_toss")}
      <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
    </a>
  );
}

function BalanceWidget({ balance }: { balance: { krw: number; usd: number } | null }) {
  const { t } = useI18n();
  if (!balance) {
    return (
      <div className="hidden sm:flex flex-col items-end">
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {t("total_assets")}
        </span>
        <span className="shimmer mt-1 h-4 w-32 rounded-md" />
      </div>
    );
  }
  return (
    <div className="hidden sm:flex flex-col items-end leading-tight">
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {t("total_assets")}
      </span>
      <span className="font-display text-sm font-semibold text-foreground tabular-nums">
        ₩{balance.krw.toLocaleString()} · ${balance.usd.toLocaleString()}
      </span>
    </div>
  );
}


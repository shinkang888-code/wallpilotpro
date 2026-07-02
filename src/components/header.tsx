import { Link, useRouterState } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";

import { AuthButton } from "@/components/auth-button";
import { HeaderAppNav } from "@/components/header-app-nav";
import { HeaderStockSearch } from "@/components/header-stock-search";
import { LanguageMenu } from "@/components/language-menu";
import { useI18n } from "@/lib/i18n";
import { canAccessMenu } from "@/lib/membership/menu-access";
import type { AppMenuId } from "@/lib/membership/menus";
import { useAuth } from "@/lib/use-auth";
import { cn } from "@/lib/utils";

const TOSS_INVEST_URL = "https://www.tossinvest.com/";

export function Header({ walletBalance }: { walletBalance: { krw: number; usd: number } | null }) {
  const { t } = useI18n();
  const auth = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const canViewMenu = (menuId: AppMenuId) =>
    canAccessMenu(menuId, auth.membershipTier, "view", [], auth.isAdmin);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-hairline bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
      {/* Brand + utilities */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-start gap-3 px-4 py-2.5 sm:px-6 lg:flex-nowrap lg:items-center">
        <Link
          to="/"
          className="flex min-w-0 shrink-0 items-center rounded-lg transition-opacity hover:opacity-90"
        >
          <img
            src="/logo.png"
            alt="WallPilot Pro"
            width={160}
            height={40}
            className="h-8 w-auto max-w-[9.5rem] object-contain object-left sm:h-9 sm:max-w-[11rem]"
          />
        </Link>

        <HeaderStockSearch />

        <div className="flex w-full items-center justify-end gap-1.5 sm:gap-2 lg:ml-0 lg:w-auto">
          <BalanceWidget balance={walletBalance} />
          <TossExternalLink />
          <div className="hidden h-5 w-px bg-hairline sm:block" aria-hidden />
          <AuthButton />
          <LanguageMenu />
        </div>
      </div>

      {/* Desktop navigation */}
      <div className="hidden border-t border-hairline/80 lg:block">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <HeaderAppNav
            pathname={pathname}
            canViewMenu={canViewMenu}
            showAdmin={auth.isStaff}
          />
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="border-t border-hairline/80 lg:hidden">
        <div className="mx-auto max-w-7xl px-2 py-1.5 sm:px-4">
          <HeaderAppNav
            pathname={pathname}
            canViewMenu={canViewMenu}
            showAdmin={auth.isStaff}
          />
        </div>
        <div className="flex justify-center border-t border-hairline/60 px-4 py-1.5 sm:hidden">
          <a
            href={TOSS_INVEST_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground"
            aria-label={t("nav_toss_aria")}
          >
            {t("nav_toss")}
            <ExternalLink className="h-3 w-3 opacity-60" />
          </a>
        </div>
      </div>
    </header>
  );
}

function TossExternalLink() {
  const { t } = useI18n();

  return (
    <a
      href={TOSS_INVEST_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-semibold text-foreground transition-colors",
        "hover:border-primary/30 hover:bg-primary/[0.03]",
      )}
      aria-label={t("nav_toss_aria")}
    >
      <span className="hidden sm:inline">{t("nav_toss")}</span>
      <span className="sm:hidden">Toss</span>
      <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
    </a>
  );
}

function BalanceWidget({ balance }: { balance: { krw: number; usd: number } | null }) {
  const { t } = useI18n();

  if (!balance) {
    return (
      <div className="hidden items-center gap-2 md:flex">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("total_assets")}
        </span>
        <span className="shimmer h-4 w-24 rounded-md" />
      </div>
    );
  }

  return (
    <div className="hidden flex-col items-end leading-tight md:flex">
      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {t("total_assets")}
      </span>
      <span className="font-display text-xs font-semibold tabular-nums text-foreground sm:text-sm">
        <span className="hidden lg:inline">₩{balance.krw.toLocaleString()} · </span>
        ${balance.usd.toLocaleString()}
      </span>
    </div>
  );
}

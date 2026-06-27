import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import { SiteAnalytics } from "../components/analytics/site-analytics";
import appCss from "../styles.css?url";
import { IpShieldGuard } from "../components/ip-shield-guard";
import { LegalFooter } from "../components/legal-footer";
import { IP_COPYRIGHT_LINE, IP_OWNER } from "../lib/ip/ownership";
import { reportWallPilotError } from "../lib/wallpilot-error-reporting";
import { I18nProvider } from "../lib/i18n";
import { AuthProvider } from "../lib/use-auth";
import { ActivityTracker } from "../components/activity-tracker";
import { PwaInstallHint } from "../components/pwa-install-hint";
import { PwaRegister } from "../components/pwa-register";
import { Toaster } from "../components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportWallPilotError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
      },
      { name: "theme-color", content: "#0a0a0a" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-title", content: "WallPilot" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "application-name", content: "WallPilot" },
      { name: "format-detection", content: "telephone=no" },
      { name: "google", content: "notranslate" },
      { title: "WallPilot Pro — 데이터 기반 퀀트 주식 분석 | 수급·재무·적정가" },
      {
        name: "description",
        content:
          "AI와 월가 퀀트 방식으로 거래량·세력 수급·재무·뉴스를 분석. 한·미 주식 Reverse-Quant 스캐너. 투자 참고 정보 제공.",
      },
      {
        name: "keywords",
        content: "주식분석, 퀀트투자, 수급분석, 적정가, 13F, AI주식, 토스증권",
      },
      { name: "author", content: IP_OWNER.legalName },
      { name: "copyright", content: IP_COPYRIGHT_LINE },
      { name: "rights", content: "Terrabridge Capital Inc. — All Rights Reserved" },
      { property: "og:title", content: "WallPilot Pro — Quant Stock Analysis" },
      {
        property: "og:description",
        content:
          "Reverse-Quant scanner for KR & US markets. Supply, fundamentals, fair value — reference analysis only.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "WallPilot Pro" },
      {
        name: "twitter:description",
        content: "Data-driven quant analysis — supply, fundamentals, fair value in one view.",
      },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f262e85d-79bb-4868-acbe-9ad0c5295e40" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f262e85d-79bb-4868-acbe-9ad0c5295e40" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "apple-touch-icon", href: "/icon.png" },
      { rel: "icon", type: "image/png", href: "/icon.png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" translate="no" className="notranslate" data-wallpilot-owner={IP_OWNER.legalName}>
      <head>
        <HeadContent />
      </head>
      <body translate="no" className="notranslate min-h-screen bg-background text-foreground antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
          <PwaRegister />
          <SiteAnalytics />
          <IpShieldGuard />
          <ActivityTracker />
          <Outlet />
          <LegalFooter />
          <PwaInstallHint className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-lg sm:left-auto sm:right-6 sm:max-w-sm" />
          <Toaster position="top-center" />
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

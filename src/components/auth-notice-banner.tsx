import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";

import { useI18n } from "@/lib/i18n";
import type { EntitlementFeature } from "@/lib/types/auth";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { trialDemoSkipsAuthNotice } from "@/lib/membership/trial-demo";
import { cn } from "@/lib/utils";

export function AuthNoticeBanner({
  feature,
  className,
}: {
  feature?: EntitlementFeature;
  className?: string;
}) {
  const { t } = useI18n();
  const auth = useAuth();
  const { isConnected: hasGeminiKey } = useGeminiApiKey();

  const byokAiPilot = feature === "ai_pilot" && hasGeminiKey;
  const trialDemo = trialDemoSkipsAuthNotice(feature);

  if (auth.loading) return null;
  if (!auth.enforced) return null;

  if (auth.enforced && !auth.clientConfigured) {
    return (
      <Banner className={className} tone="warn">
        <span>{t("auth_err_client_config")}</span>
      </Banner>
    );
  }

  if (auth.enforced && !auth.user && !byokAiPilot && !trialDemo) {
    return (
      <Banner className={className} tone="info">
        <span>{t("auth_notice_sign_in")}</span>
        <button
          type="button"
          onClick={() => {
            void auth.signInWithGoogle().then((err) => {
              if (err === "supabase_not_configured") toast.error(t("auth_err_client_config"));
              else if (err) toast.error(err);
            });
          }}
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {t("sign_in_google")}
        </button>
      </Banner>
    );
  }

  if (auth.isPending && !byokAiPilot && !trialDemo) {
    return (
      <Banner className={className} tone="warn">
        <span>{t("auth_notice_pending")}</span>
        <Link to="/pending" className="shrink-0 text-xs font-semibold underline">
          {t("auth_pending_badge")}
        </Link>
      </Banner>
    );
  }

  if (feature && auth.entitlements && !auth.entitlements[feature] && !byokAiPilot && !trialDemo) {
    return (
      <Banner className={className} tone="warn">
        <span>{t("auth_notice_upgrade")}</span>
        <Link
          to="/pricing"
          className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          {t("upgrade")}
        </Link>
      </Banner>
    );
  }

  return null;
}

function Banner({
  children,
  className,
  tone,
}: {
  children: ReactNode;
  className?: string;
  tone: "info" | "warn";
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs",
        tone === "info" && "border-primary/20 bg-primary/5 text-foreground",
        tone === "warn" && "border-amber-200 bg-amber-50 text-amber-950",
        className,
      )}
    >
      {children}
    </div>
  );
}

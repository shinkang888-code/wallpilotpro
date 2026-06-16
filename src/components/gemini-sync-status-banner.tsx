import { Link } from "@tanstack/react-router";
import { Clock, CloudOff } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function GeminiSyncStatusBanner({
  redeployPending,
  localOnly,
  loading,
  className,
}: {
  redeployPending: boolean;
  localOnly: boolean;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  if (loading || (!redeployPending && !localOnly)) return null;

  if (redeployPending) {
    return (
      <p
        className={cn(
          "flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-[11px] text-sky-900",
          className,
        )}
      >
        <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>{t("gem_redeploy_pending")}</span>
      </p>
    );
  }

  return (
    <p
      className={cn(
        "flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900",
        className,
      )}
    >
      <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        {t("gem_warn_local_only")}{" "}
        <Link to="/my-api" className="font-semibold underline">
          My API
        </Link>
      </span>
    </p>
  );
}

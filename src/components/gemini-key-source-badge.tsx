import { Cloud, HardDrive, Loader2, Unplug } from "lucide-react";

import type { GeminiKeySource } from "@/lib/gemini/gemini-key-resolution";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function GeminiKeySourceBadge({
  source,
  loading,
  className,
}: {
  source: GeminiKeySource;
  loading?: boolean;
  className?: string;
}) {
  const { t } = useI18n();

  if (loading) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-white px-2.5 py-1 text-[10px] font-semibold text-muted-foreground",
          className,
        )}
      >
        <Loader2 className="h-3 w-3 animate-spin" />
        {t("gem_source_loading")}
      </span>
    );
  }

  const config = {
    vercel: {
      icon: Cloud,
      label: t("gem_source_vercel"),
      className: "border-emerald-200 bg-emerald-50 text-emerald-900",
    },
    local: {
      icon: HardDrive,
      label: t("gem_source_local"),
      className: "border-amber-200 bg-amber-50 text-amber-900",
    },
    none: {
      icon: Unplug,
      label: t("gem_source_none"),
      className: "border-hairline bg-surface text-muted-foreground",
    },
  } as const;

  const item = config[source];
  const Icon = item.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold",
        item.className,
        className,
      )}
    >
      <Icon className="h-3 w-3 shrink-0" />
      {item.label}
    </span>
  );
}

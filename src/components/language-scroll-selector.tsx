import { useRef } from "react";

import { useI18n } from "@/lib/i18n";
import { LOCALE_ORDER, LOCALES, type AppLocale } from "@/lib/i18n/constants";
import { preloadLocale } from "@/lib/i18n/pack-loader";
import { cn } from "@/lib/utils";

/** Horizontal scroll language selector — EN KO JA ZH VI TL ID HI */
export function LanguageScrollSelector({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const scrollerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollerRef}
      role="radiogroup"
      aria-label="Language"
      className={cn(
        "inline-flex max-w-[11rem] snap-x snap-mandatory gap-0.5 overflow-x-auto rounded-full border border-hairline bg-surface p-0.5 text-xs font-semibold scrollbar-none sm:max-w-none",
        className,
      )}
    >
      {LOCALES.map(({ code, label }) => (
        <button
          key={code}
          type="button"
          role="radio"
          aria-checked={lang === code}
          onMouseEnter={() => void preloadLocale(code)}
          onFocus={() => void preloadLocale(code)}
          onClick={() => setLang(code as AppLocale)}
          className={cn(
            "shrink-0 snap-center rounded-full px-2 py-1 transition-all duration-150 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
            lang === code ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** Resolve localized string from a multi-locale record (membership tiers, plans). */
export function pickLocaleString(
  record: Partial<Record<AppLocale, string>> & { en: string; ko?: string },
  lang: AppLocale,
): string {
  return record[lang] ?? record.en;
}

export { LOCALE_ORDER };

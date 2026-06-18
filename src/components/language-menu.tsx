import { Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { LOCALES, type AppLocale } from "@/lib/i18n/constants";
import { preloadLocale } from "@/lib/i18n/pack-loader";
import { cn } from "@/lib/utils";

/** Compact language picker — saves header space on desktop. */
export function LanguageMenu({ className }: { className?: string }) {
  const { lang, setLang } = useI18n();
  const current = LOCALES.find((l) => l.code === lang) ?? LOCALES[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-semibold text-foreground transition-colors",
          "hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
          className,
        )}
        aria-label="Language"
      >
        <Languages className="h-3.5 w-3.5 text-muted-foreground" />
        <span>{current.label}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[8rem]">
        <DropdownMenuRadioGroup
          value={lang}
          onValueChange={(v) => setLang(v as AppLocale)}
        >
          {LOCALES.map(({ code, label }) => (
            <DropdownMenuRadioItem
              key={code}
              value={code}
              onMouseEnter={() => void preloadLocale(code)}
              onFocus={() => void preloadLocale(code)}
              className="text-xs font-medium"
            >
              {label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

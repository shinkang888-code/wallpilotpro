// filepath: src/components/marketing/landing-value-props.tsx
import { BarChart3, Bot, TrendingUp } from "lucide-react";

import { pickLocaleString } from "@/components/language-scroll-selector";
import { LANDING_STEPS, LANDING_VALUE_PROPS } from "@/lib/marketing/landing-copy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const ICONS = {
  chart: BarChart3,
  flow: TrendingUp,
  ai: Bot,
} as const;

export function LandingValueProps({ className }: { className?: string }) {
  const { lang } = useI18n();

  return (
    <div className={cn("space-y-10", className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        {LANDING_VALUE_PROPS.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <article
              key={item.icon}
              className="rounded-xl border border-hairline/70 bg-surface/50 p-5 transition hover:border-primary/30"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <h3 className="text-sm font-bold text-foreground">
                {pickLocaleString(item.title, lang)}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {pickLocaleString(item.body, lang)}
              </p>
            </article>
          );
        })}
      </div>

      <div>
        <div className="mb-5 flex items-center gap-2">
          <span className="h-px w-6 bg-foreground/40" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            {lang === "ko" ? "작동 방식" : "How it works"}
          </span>
        </div>
        <ol className="grid gap-4 sm:grid-cols-3">
          {LANDING_STEPS.map((step) => (
            <li
              key={step.step}
              className="relative rounded-xl border border-dashed border-hairline/80 px-4 py-5"
            >
              <span className="text-lg font-bold text-primary">{step.step}</span>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {pickLocaleString(step.title, lang)}
              </p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {pickLocaleString(step.body, lang)}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// filepath: src/components/marketing/landing-hero.tsx
import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";

import { pickLocaleString } from "@/components/language-scroll-selector";
import { LANDING_HERO } from "@/lib/marketing/landing-copy";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LandingHeroProps = {
  onPreviewScan?: () => void;
  className?: string;
};

export function LandingHero({ onPreviewScan, className }: LandingHeroProps) {
  const { lang } = useI18n();

  return (
    <section className={cn("relative overflow-hidden rounded-2xl border border-hairline/80 bg-gradient-to-br from-surface via-background to-surface p-6 sm:p-10", className)}>
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary/10 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-cyan-500/10 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <span className="h-px w-6 bg-primary" />
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
            {pickLocaleString(LANDING_HERO.eyebrow, lang)}
          </span>
          <Sparkles className="h-3.5 w-3.5 text-primary/80" aria-hidden />
        </div>

        <h1 className="font-display max-w-3xl text-[32px] font-bold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[52px]">
          {pickLocaleString(LANDING_HERO.headline, lang)}
        </h1>

        <p className="mt-4 max-w-2xl text-sm font-medium leading-relaxed text-muted-foreground sm:text-base">
          {pickLocaleString(LANDING_HERO.subhead, lang)}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onPreviewScan}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
          >
            {pickLocaleString(LANDING_HERO.ctaPrimary, lang)}
            <ArrowRight className="h-4 w-4" />
          </button>
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-background px-5 py-2.5 text-sm font-semibold text-foreground transition hover:bg-surface"
          >
            {pickLocaleString(LANDING_HERO.ctaSecondary, lang)}
          </Link>
        </div>
      </div>
    </section>
  );
}

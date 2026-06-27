// filepath: src/components/marketing/landing-faq.tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { pickLocaleString } from "@/components/language-scroll-selector";
import { LANDING_FAQ } from "@/lib/marketing/landing-copy";
import { useI18n } from "@/lib/i18n";

export function LandingFaq() {
  const { lang } = useI18n();

  return (
    <section className="rounded-xl border border-hairline/70 bg-surface/30 p-5 sm:p-6">
      <h2 className="text-lg font-bold text-foreground">
        {lang === "ko" ? "자주 묻는 질문" : "FAQ"}
      </h2>
      <Accordion type="single" collapsible className="mt-3">
        {LANDING_FAQ.map((item, i) => (
          <AccordionItem key={i} value={`faq-${i}`}>
            <AccordionTrigger className="text-left text-sm">
              {pickLocaleString(item.q, lang)}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              {pickLocaleString(item.a, lang)}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}

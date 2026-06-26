import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function DeepAgentReportScroll({
  markdownEn,
  markdownKo,
}: {
  markdownEn: string;
  markdownKo: string;
}) {
  const { t, lang } = useI18n();
  const koreanOnly = lang === "ko";

  return (
    <div
      className={cn(
        "max-h-[min(70vh,520px)] overflow-y-auto rounded-xl border border-hairline bg-white",
        "scroll-smooth",
      )}
    >
      {!koreanOnly ? (
        <section className="border-b border-hairline p-4 sm:p-5">
          <p className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 bg-white/95 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground backdrop-blur sm:-mx-5 sm:px-5">
            {t("ws_deep_en_section")}
          </p>
          <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-foreground sm:text-xs">
            {markdownEn}
          </pre>
        </section>
      ) : null}

      <section className={cn("p-4 sm:p-5", koreanOnly ? "" : "bg-primary/[0.02]")}>
        <p className="sticky top-0 z-10 -mx-4 -mt-4 mb-3 bg-white/95 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-primary backdrop-blur sm:-mx-5 sm:px-5">
          {t("ws_deep_ko_section")}
        </p>
        {koreanOnly ? null : (
          <p className="mb-4 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">{t("ws_deep_ko_hint")}</p>
        )}
        <pre className="whitespace-pre-wrap text-[11px] leading-[1.75] text-foreground sm:text-xs">
          {markdownKo}
        </pre>
      </section>
    </div>
  );
}

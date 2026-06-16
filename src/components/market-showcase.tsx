import { useI18n } from "@/lib/i18n";
import bullImg from "@/assets/wall-st-bull.jpg";
import nyseImg from "@/assets/nyse-facade.jpg";
import tickerImg from "@/assets/ticker-board.jpg";

/**
 * Apple-style editorial showcase strip:
 * full-bleed image panels with oversized headlines, generous whitespace,
 * placed between functional modules to give the page rhythm.
 */
export function MarketShowcase() {
  const { t } = useI18n();
  return (
    <section className="space-y-4 sm:space-y-5">
      {/* Marquee panel — Wall Street bull */}
      <article className="group relative overflow-hidden rounded-[28px] sm:rounded-[36px]">
        <img
          src={bullImg}
          alt="Wall Street charging bull"
          loading="lazy"
          width={1600}
          height={1024}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-[1.04]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/55 to-transparent" />
        <div className="relative flex min-h-[320px] flex-col justify-end p-7 sm:min-h-[420px] sm:p-12">
          <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-200/90 backdrop-blur-md">
            <span className="h-1 w-1 rounded-full bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,0.9)]" />
            {t("showcase_kicker")}
          </span>
          <h2 className="max-w-[14ch] font-display text-3xl font-bold leading-[1.02] tracking-[-0.025em] text-white sm:text-[44px]">
            {t("showcase_title")}
          </h2>
          <p className="mt-3 max-w-md text-[13px] font-medium leading-relaxed text-white/65 sm:text-sm">
            {t("showcase_sub")}
          </p>
        </div>
      </article>

      {/* Split row — NYSE + ticker board */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <SplitTile
          img={nyseImg}
          alt="New York Stock Exchange"
          kicker="NYSE · NASDAQ"
          title={t("tile_us")}
          tone="warm"
        />
        <SplitTile
          img={tickerImg}
          alt="Stock ticker board"
          kicker="KOSPI · KOSDAQ"
          title={t("tile_kr")}
          tone="cool"
        />
      </div>
    </section>
  );
}

function SplitTile({
  img,
  alt,
  kicker,
  title,
  tone,
}: {
  img: string;
  alt: string;
  kicker: string;
  title: string;
  tone: "warm" | "cool";
}) {
  return (
    <article className="group relative overflow-hidden rounded-[24px] sm:rounded-[28px]">
      <img
        src={img}
        alt={alt}
        loading="lazy"
        width={1600}
        height={1024}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.05]"
      />
      <div
        className={
          tone === "warm"
            ? "absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent"
            : "absolute inset-0 bg-gradient-to-t from-slate-950/92 via-slate-950/45 to-slate-950/10"
        }
      />
      <div className="relative flex min-h-[220px] flex-col justify-end p-5 sm:min-h-[260px] sm:p-7">
        <span className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/55">
          {kicker}
        </span>
        <h3 className="mt-1.5 font-display text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl">
          {title}
        </h3>
      </div>
    </article>
  );
}

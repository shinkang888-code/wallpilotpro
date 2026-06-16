import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import heroMarket from "@/assets/hero-market.jpg";

export function ScannerControl({
  isLoading,
  scanDisabled,
  onScan,
  toggles,
  setToggles,
}: {
  isLoading: boolean;
  scanDisabled?: boolean;
  onScan: () => void;
  toggles: { toss: boolean; thirteenF: boolean; quant: boolean };
  setToggles: (t: { toss: boolean; thirteenF: boolean; quant: boolean }) => void;
}) {
  const { t } = useI18n();

  return (
    <section className="group relative overflow-hidden rounded-[28px] shadow-[0_24px_60px_-30px_rgba(15,23,42,0.45)] sm:rounded-[32px]">
      {/* Background image */}
      <img
        src={heroMarket}
        alt=""
        aria-hidden="true"
        width={1024}
        height={1024}
        className="absolute inset-0 h-full w-full scale-105 object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
      />
      {/* Layered gradient for legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/35 via-slate-950/55 to-slate-950/90" />
      <div className="absolute inset-0 bg-[radial-gradient(120%_70%_at_50%_120%,rgba(49,130,246,0.35),transparent_60%)]" />

      <div className="relative flex min-h-[420px] flex-col justify-end p-6 sm:p-8">
        <span className="mb-3 inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-blue-100 backdrop-blur-md">
          <span className="h-1 w-1 rounded-full bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,1)]" />
          Market Mirror
        </span>

        <h2 className="font-display text-2xl font-bold leading-[1.05] tracking-tight text-white sm:text-[28px]">
          {t("guru_title")}
        </h2>
        <p className="mt-2 max-w-[28ch] text-[13px] leading-relaxed text-white/65 sm:text-sm">
          {t("guru_subtitle")}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <GlassPill
            label={t("toggle_toss")}
            active={toggles.toss}
            color="blue"
            onClick={() => setToggles({ ...toggles, toss: !toggles.toss })}
          />
          <GlassPill
            label={t("toggle_13f")}
            active={toggles.thirteenF}
            color="indigo"
            onClick={() => setToggles({ ...toggles, thirteenF: !toggles.thirteenF })}
          />
          <GlassPill
            label={t("toggle_quant")}
            active={toggles.quant}
            color="mint"
            onClick={() => setToggles({ ...toggles, quant: !toggles.quant })}
          />
        </div>

        <button
          onClick={onScan}
          disabled={isLoading || scanDisabled}
          className={cn(
            "mt-6 w-full rounded-2xl bg-white px-6 py-4 text-[15px] font-bold tracking-tight text-primary",
            "shadow-[0_12px_30px_-12px_rgba(0,0,0,0.5)] transition-all duration-200",
            "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/30",
            "disabled:cursor-not-allowed disabled:opacity-80",
          )}
        >
          {isLoading ? t("scanning") : t("scan_cta")}
        </button>
      </div>
    </section>
  );
}

function GlassPill({
  label,
  active,
  color,
  onClick,
}: {
  label: string;
  active: boolean;
  color: "blue" | "indigo" | "mint";
  onClick: () => void;
}) {
  const dot =
    color === "blue"
      ? "bg-blue-300 shadow-[0_0_8px_rgba(147,197,253,1)]"
      : color === "indigo"
        ? "bg-indigo-300 shadow-[0_0_8px_rgba(165,180,252,0.9)]"
        : "bg-emerald-300 shadow-[0_0_8px_rgba(110,231,183,0.9)]";

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold backdrop-blur-xl transition-all duration-200 active:scale-[0.96]",
        active
          ? "border-white/25 bg-white/15 text-white"
          : "border-white/10 bg-white/[0.04] text-white/55 hover:text-white",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", active ? dot : "bg-white/30")} />
      {label}
    </button>
  );
}

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, KeyRound, ShieldCheck, ChevronDown } from "lucide-react";

export function TossApiPanel() {
  const { t } = useI18n();
  const { key, save, clear, isConnected } = useTossApiKey();
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isConnected ? "bg-emerald-50 text-positive" : "bg-white text-primary",
          )}
        >
          {isConnected ? <ShieldCheck className="h-5 w-5" /> : <KeyRound className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
            {t("api_panel_title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("api_panel_subtitle")}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("api_key_label")}
        </label>
        <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <input
              type={reveal ? "text" : "password"}
              value={isConnected ? key ?? "" : draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={isConnected}
              placeholder={t("api_key_placeholder")}
              className={cn(
                "w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm tabular-nums text-foreground",
                "placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10",
                "disabled:bg-surface disabled:text-muted-foreground",
              )}
            />
            <button
              type="button"
              onClick={() => setReveal((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
              aria-label="toggle reveal"
            >
              {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {isConnected ? (
            <button
              onClick={clear}
              className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-destructive transition-all duration-200 active:scale-[0.98] hover:bg-red-50"
            >
              {t("api_clear")}
            </button>
          ) : (
            <button
              onClick={() => draft.trim() && save(draft.trim())}
              disabled={!draft.trim()}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
            >
              {t("api_save")}
            </button>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setOpenHelp((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openHelp && "rotate-180")} />
        {t("api_how")}
      </button>
      {openHelp && (
        <p className="mt-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-muted-foreground">
          {t("api_how_body")}
        </p>
      )}
    </section>
  );
}

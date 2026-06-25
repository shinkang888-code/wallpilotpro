import { useState } from "react";
import { Eye, EyeOff, KeyRound, ShieldCheck, ChevronDown } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { useTossApiKey } from "@/lib/use-toss-api-key";
import { cn } from "@/lib/utils";

function CredentialField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  reveal,
  onToggleReveal,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  disabled?: boolean;
  reveal: boolean;
  onToggleReveal: () => void;
}) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          type={reveal ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm text-foreground",
            "placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10",
            "disabled:bg-surface disabled:text-muted-foreground",
          )}
        />
        <button
          type="button"
          onClick={onToggleReveal}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
          aria-label="toggle reveal"
        >
          {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export function TossApiPanel() {
  const { t } = useI18n();
  const { clientId, clientSecret, save, clear, isConnected } = useTossApiKey();
  const [draftId, setDraftId] = useState("");
  const [draftSecret, setDraftSecret] = useState("");
  const [revealId, setRevealId] = useState(false);
  const [revealSecret, setRevealSecret] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);

  const canSave = draftId.trim().length > 0 && draftSecret.trim().length > 0;

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

      <div className="mt-5 space-y-4">
        <CredentialField
          label={t("api_client_id_label")}
          value={isConnected ? (clientId ?? "") : draftId}
          onChange={setDraftId}
          placeholder={t("api_client_id_placeholder")}
          disabled={isConnected}
          reveal={revealId}
          onToggleReveal={() => setRevealId((v) => !v)}
        />
        <CredentialField
          label={t("api_secret_label")}
          value={isConnected ? (clientSecret ?? "") : draftSecret}
          onChange={setDraftSecret}
          placeholder={t("api_secret_placeholder")}
          disabled={isConnected}
          reveal={revealSecret}
          onToggleReveal={() => setRevealSecret((v) => !v)}
        />

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {isConnected ? (
            <button
              type="button"
              onClick={() => {
                clear();
                setDraftId("");
                setDraftSecret("");
              }}
              className="rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-destructive transition-all duration-200 active:scale-[0.98] hover:bg-red-50 sm:min-w-[120px]"
            >
              {t("api_clear")}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => save(draftId, draftSecret)}
              disabled={!canSave}
              className="rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:min-w-[120px]"
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

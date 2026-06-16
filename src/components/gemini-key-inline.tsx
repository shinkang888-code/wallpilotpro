import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Sparkles, ShieldCheck, Trash2 } from "lucide-react";
import { Link } from "@tanstack/react-router";

import { testGeminiApiKey } from "@/lib/api/gemini-connect.functions";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Compact inline Gemini API key entry — for surfaces like /ai-pilot
 * where users need to drop in a key without leaving the page.
 */
export function GeminiKeyInline({ className }: { className?: string }) {
  const { t } = useI18n();
  const { key, save, clear, isConnected } = useGeminiApiKey();
  const [draft, setDraft] = useState("");
  const [reveal, setReveal] = useState(false);
  const [testing, setTesting] = useState(false);

  const handleSave = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setTesting(true);
    try {
      const res = await testGeminiApiKey({ data: { apiKey: trimmed } });
      if (res.ok) {
        save(trimmed);
        setDraft("");
        toast.success(t("pilot_inline_key_saved"));
      } else {
        toast.error(t("pilot_inline_key_invalid"));
      }
    } catch {
      toast.error(t("pilot_inline_unreachable"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-hairline bg-surface p-4 sm:p-5",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            isConnected ? "bg-emerald-50 text-positive" : "bg-white text-primary",
          )}
        >
          {isConnected ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold text-foreground sm:text-base">
            {isConnected ? t("pilot_inline_title_connected") : t("pilot_inline_title_disconnected")}
          </h3>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
            {isConnected ? t("pilot_inline_desc_connected") : t("pilot_inline_desc_disconnected")}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            type={reveal ? "text" : "password"}
            value={isConnected ? key ?? "" : draft}
            onChange={(e) => setDraft(e.target.value)}
            disabled={isConnected}
            placeholder="AIza..."
            className={cn(
              "w-full rounded-xl border border-hairline bg-white px-4 py-2.5 pr-10 font-mono text-sm text-foreground",
              "placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10",
              "disabled:bg-surface disabled:text-muted-foreground",
            )}
          />
          <button
            type="button"
            onClick={() => setReveal((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:text-foreground"
            aria-label="toggle reveal"
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {isConnected ? (
          <button
            type="button"
            onClick={clear}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-destructive transition hover:bg-red-50 active:scale-[0.98]"
          >
            <Trash2 className="h-4 w-4" />
            삭제
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={testing || !draft.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
          >
            {testing && <Loader2 className="h-4 w-4 animate-spin" />}
            저장
          </button>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Google AI Studio에서 키 발급 →
        </a>
        <span>·</span>
        <Link to="/my-api" className="underline-offset-2 hover:underline">
          고급 설정 (Vercel 동기화)
        </Link>
      </div>
    </section>
  );
}

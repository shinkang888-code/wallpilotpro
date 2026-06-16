import { useEffect, useState } from "react";
import { Smartphone, X } from "lucide-react";

import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "wallpilot.pwa.hint.dismissed";

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function PwaInstallHint({ className }: { className?: string }) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || !isMobileDevice()) return;
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-relaxed text-foreground",
        className,
      )}
    >
      <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("pwa_hint_title")}</p>
        <p className="mt-1 text-muted-foreground">{t("pwa_hint_body")}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-white/80 hover:text-foreground"
        aria-label={t("pwa_hint_dismiss")}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

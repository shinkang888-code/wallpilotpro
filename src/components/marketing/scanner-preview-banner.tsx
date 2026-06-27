// filepath: src/components/marketing/scanner-preview-banner.tsx
/** GTM Week 3-4: Free → Day funnel — in-app signup banner */
import { toast } from "sonner";

import { pickLocaleString } from "@/components/language-scroll-selector";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

const COPY = {
  title: {
    ko: "스캐너 전체 기능은 Day Trading 이상에서 이용 가능합니다",
    en: "Full scanner requires Day Trading tier or above",
  },
  body: {
    ko: "Google 로그인 후 미리보기를 확인하고, 요금제에서 Day Trading(₩39,000/월)을 시작하세요.",
    en: "Sign in with Google to preview, then start Day Trading ($29/mo) on the pricing page.",
  },
  cta: {
    ko: "Google로 시작하기",
    en: "Start with Google",
  },
};

export function ScannerPreviewBanner() {
  const { lang, t } = useI18n();
  const auth = useAuth();

  if (auth.loading || auth.user) return null;

  return (
    <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 px-4 py-3 sm:flex sm:items-center sm:justify-between sm:gap-4">
      <div>
        <p className="text-sm font-semibold text-foreground">{pickLocaleString(COPY.title, lang)}</p>
        <p className="mt-1 text-xs text-muted-foreground">{pickLocaleString(COPY.body, lang)}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          void auth.signInWithGoogle().then((err) => {
            if (err === "supabase_not_configured") toast.error(t("auth_err_client_config"));
            else if (err) toast.error(err);
          });
        }}
        className="mt-3 shrink-0 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground sm:mt-0"
      >
        {pickLocaleString(COPY.cta, lang)}
      </button>
    </div>
  );
}

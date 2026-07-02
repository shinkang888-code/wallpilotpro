import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  detectBrowserLocale,
  isAppLocale,
  LOCALE_ORDER,
  LOCALES,
  STORAGE_KEY,
  type AppLocale,
} from "./constants";
import type { TranslationKey } from "./keys.generated";
import {
  getCachedPack,
  getEnglishPackSync,
  loadPack,
  prefetchAdjacentLocales,
  translate,
  warmEnglishPack,
} from "./pack-loader";

type I18nContextValue = {
  lang: AppLocale;
  setLang: (locale: AppLocale) => void;
  t: (key: TranslationKey | (string & {})) => string;
  ready: boolean;
};

const I18nCtx = createContext<I18nContextValue | null>(null);

function readStoredLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && isAppLocale(stored)) return stored;
  } catch {
    /* SSR / private mode */
  }
  return detectBrowserLocale();
}

export function I18nProvider({ children }: { children: ReactNode }) {
  // SSR and first client paint must match ("en") to avoid React #418 hydration errors.
  const [lang, setLangState] = useState<AppLocale>("en");
  const [ready, setReady] = useState(false);
  const [activePack, setActivePack] = useState<ReturnType<typeof getCachedPack>>(() =>
    getEnglishPackSync(),
  );
  const [enPack, setEnPack] = useState(() => getEnglishPackSync());

  useEffect(() => {
    const stored = readStoredLocale();
    if (stored !== "en") setLangState(stored);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [en, active] = await Promise.all([warmEnglishPack(), loadPack(lang)]);
      if (cancelled) return;
      setEnPack(en);
      setActivePack(active);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    const def = LOCALES.find((l) => l.code === lang);
    document.documentElement.lang = def?.htmlLang ?? lang;
    document.documentElement.classList.add("notranslate");
    document.documentElement.setAttribute("translate", "no");
    document.body?.classList.add("notranslate");
    document.body?.setAttribute("translate", "no");
  }, [lang]);

  const setLang = useCallback((locale: AppLocale) => {
    if (!LOCALE_ORDER.includes(locale)) return;
    setLangState(locale);
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      /* ignore */
    }
    prefetchAdjacentLocales(locale);
    void loadPack(locale).then((pack) => setActivePack(pack));
  }, []);

  const t = useCallback(
    (key: TranslationKey | (string & {})) =>
      translate(activePack, enPack, key as TranslationKey),
    [activePack, enPack],
  );

  const value = useMemo(
    () => ({ lang, setLang, t, ready }),
    [lang, setLang, t, ready],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const v = useContext(I18nCtx);
  if (!v) throw new Error("useI18n must be used inside I18nProvider");
  return v;
}

export type { AppLocale, TranslationKey };

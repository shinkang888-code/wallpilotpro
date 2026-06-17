/**
 * Global i18n — 8 locales, O(1) lookup, lazy-loaded language packs.
 */
export type AppLocale = "en" | "ko" | "ja" | "zh" | "vi" | "tl" | "id" | "hi";

export type { TranslationKey } from "./keys.generated";

export type LocaleDefinition = {
  code: AppLocale;
  label: string;
  htmlLang: string;
};

/** Fixed display order: EN → KO → JA → ZH → VI → TL → ID → HI */
export const LOCALE_ORDER: readonly AppLocale[] = [
  "en",
  "ko",
  "ja",
  "zh",
  "vi",
  "tl",
  "id",
  "hi",
] as const;

export const LOCALES: readonly LocaleDefinition[] = [
  { code: "en", label: "EN", htmlLang: "en" },
  { code: "ko", label: "KO", htmlLang: "ko" },
  { code: "ja", label: "JA", htmlLang: "ja" },
  { code: "zh", label: "ZH", htmlLang: "zh-Hans" },
  { code: "vi", label: "VI", htmlLang: "vi" },
  { code: "tl", label: "TL", htmlLang: "fil" },
  { code: "id", label: "ID", htmlLang: "id" },
  { code: "hi", label: "HI", htmlLang: "hi" },
] as const;

export const STORAGE_KEY = "wallpilotpro.locale";

export function isAppLocale(v: string): v is AppLocale {
  return (LOCALE_ORDER as readonly string[]).includes(v);
}

export function detectBrowserLocale(): AppLocale {
  if (typeof navigator === "undefined") return "en";
  const raw = (navigator.language ?? "en").toLowerCase();
  if (raw.startsWith("ko")) return "ko";
  if (raw.startsWith("ja")) return "ja";
  if (raw.startsWith("zh")) return "zh";
  if (raw.startsWith("vi")) return "vi";
  if (raw.startsWith("fil") || raw.startsWith("tl")) return "tl";
  if (raw.startsWith("id")) return "id";
  if (raw.startsWith("hi")) return "hi";
  return "en";
}

/** AI Pilot LLM prompts currently support ko/en only. */
export function toAiPilotLang(lang: AppLocale): "ko" | "en" {
  return lang === "ko" ? "ko" : "en";
}

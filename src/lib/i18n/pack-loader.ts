import type { AppLocale } from "./constants";
import type { TranslationKey } from "./keys.generated";
import { pack as enPackStatic } from "./packs/en";

export type MessagePack = Readonly<Record<TranslationKey, string>>;

type PackLoader = () => Promise<{ pack: MessagePack }>;

/** Lazy loaders — each locale is a separate Vite chunk (fast initial load). */
const LOADERS: Record<AppLocale, PackLoader> = {
  en: () => import("./packs/en"),
  ko: () => import("./packs/ko"),
  ja: () => import("./packs/ja"),
  zh: () => import("./packs/zh"),
  vi: () => import("./packs/vi"),
  tl: () => import("./packs/tl"),
  id: () => import("./packs/id"),
  hi: () => import("./packs/hi"),
};

const cache = new Map<AppLocale, MessagePack>();
cache.set("en", enPackStatic);

const inflight = new Map<AppLocale, Promise<MessagePack>>();

/** Eager-load English for zero-latency first paint. */
let enReady: Promise<MessagePack> | null = null;

export function getEnglishPackSync(): MessagePack {
  return enPackStatic;
}

export function preloadLocale(locale: AppLocale): Promise<MessagePack> {
  return loadPack(locale);
}

export function loadPack(locale: AppLocale): Promise<MessagePack> {
  const hit = cache.get(locale);
  if (hit) return Promise.resolve(hit);

  let pending = inflight.get(locale);
  if (!pending) {
    pending = LOADERS[locale]().then((m) => {
      cache.set(locale, m.pack);
      inflight.delete(locale);
      return m.pack;
    });
    inflight.set(locale, pending);
  }
  return pending;
}

export function getCachedPack(locale: AppLocale): MessagePack | null {
  return cache.get(locale) ?? null;
}

export function warmEnglishPack(): Promise<MessagePack> {
  if (!enReady) enReady = loadPack("en");
  return enReady;
}

/** O(1) translate — falls back to English then key name. */
export function translate(
  pack: MessagePack | null,
  fallback: MessagePack | null,
  key: TranslationKey,
): string {
  if (pack?.[key]) return pack[key];
  if (fallback?.[key]) return fallback[key];
  return key;
}

export function prefetchAdjacentLocales(current: AppLocale): void {
  const order: AppLocale[] = ["en", "ko", "ja", "zh", "vi", "tl", "id", "hi"];
  const idx = order.indexOf(current);
  for (const delta of [-1, 1]) {
    const next = order[idx + delta];
    if (next) void loadPack(next);
  }
}

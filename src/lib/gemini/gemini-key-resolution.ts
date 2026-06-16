export const GEMINI_KEY_MIN_LEN = 20;

export type GeminiKeySource = "vercel" | "local" | "none";

export type GeminiErrorReason =
  | "no_key"
  | "vercel_key_invalid"
  | "client_key_invalid"
  | "parse_error";

const PLACEHOLDER_PATTERNS = [
  /^your[_-]?/i,
  /placeholder/i,
  /changeme/i,
  /replace[_-]?me/i,
  /insert[_-]?here/i,
  /^x+$/i,
  /^\.+$/,
  /^\*+$/,
  /^todo$/i,
  /^gemini[_-]?api[_-]?key$/i,
  /^api[_-]?key$/i,
  /^test[_-]?key$/i,
  /^dummy/i,
  /^sample/i,
  /^sk-[x*]+$/i,
];

export function isValidGeminiKeyLength(key?: string | null): boolean {
  return (key?.trim() ?? "").length >= GEMINI_KEY_MIN_LEN;
}

/** Treat empty strings, short values, and common placeholders as unset. */
export function isLikelyPlaceholderKey(key?: string | null): boolean {
  const k = key?.trim() ?? "";
  if (!k) return true;
  if (k.length < GEMINI_KEY_MIN_LEN) return true;
  if (PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(k))) return true;
  if (new Set(k).size === 1) return true;
  return false;
}

export function isUsableGeminiKey(key?: string | null): boolean {
  return isValidGeminiKeyLength(key) && !isLikelyPlaceholderKey(key);
}

/** Vercel env first, then browser key (My API localStorage). */
export function pickGeminiKeySource(
  vercelKey: string,
  clientKey?: string | null,
): GeminiKeySource {
  if (isUsableGeminiKey(vercelKey)) return "vercel";
  if (isUsableGeminiKey(clientKey)) return "local";
  return "none";
}

export function pickGeminiApiKey(vercelKey: string, clientKey?: string | null): string {
  const source = pickGeminiKeySource(vercelKey, clientKey);
  if (source === "vercel") return vercelKey.trim();
  if (source === "local") return clientKey!.trim();
  return "";
}

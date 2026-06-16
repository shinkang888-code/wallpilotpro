import { getServerConfig } from "@/lib/config.server";
import {
  isUsableGeminiKey,
  pickGeminiApiKey,
  pickGeminiKeySource,
  type GeminiKeySource,
} from "@/lib/gemini/gemini-key-resolution";

export type { GeminiErrorReason, GeminiKeySource } from "@/lib/gemini/gemini-key-resolution";

export type GeminiKeyBundle = {
  vercelKey: string;
  clientKey: string;
  vercelUsable: boolean;
  clientUsable: boolean;
  activeSource: GeminiKeySource;
  activeKey: string;
};

export function getGeminiKeyBundle(clientKey?: string | null): GeminiKeyBundle {
  const vercelKey = getServerConfig().geminiApiKey.trim();
  const normalizedClient = clientKey?.trim() ?? "";
  const vercelUsable = isUsableGeminiKey(vercelKey);
  const clientUsable = isUsableGeminiKey(normalizedClient);
  const activeSource = pickGeminiKeySource(vercelKey, normalizedClient);
  return {
    vercelKey,
    clientKey: normalizedClient,
    vercelUsable,
    clientUsable,
    activeSource,
    activeKey: pickGeminiApiKey(vercelKey, normalizedClient),
  };
}

/** Vercel env first, then user-supplied key from My API (browser). */
export function resolveGeminiApiKey(clientKey?: string | null): string {
  return getGeminiKeyBundle(clientKey).activeKey;
}

export function resolveGeminiKeySource(clientKey?: string | null): GeminiKeySource {
  return getGeminiKeyBundle(clientKey).activeSource;
}

export function isGeminiKeyAvailable(clientKey?: string | null): boolean {
  return getGeminiKeyBundle(clientKey).activeSource !== "none";
}

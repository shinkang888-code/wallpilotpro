import type { GeminiErrorReason } from "@/lib/gemini/gemini-key-resolution";

export function parseGeminiErrorReason(message: string): GeminiErrorReason | null {
  const match = message.match(/^gemini_error:(no_key|vercel_key_invalid|client_key_invalid|parse_error)/);
  return (match?.[1] as GeminiErrorReason | undefined) ?? null;
}

export function geminiErrorI18nKey(reason: GeminiErrorReason): string {
  const map: Record<GeminiErrorReason, string> = {
    no_key: "pilot_err_no_key",
    vercel_key_invalid: "pilot_err_vercel_key_invalid",
    client_key_invalid: "pilot_err_client_key_invalid",
    parse_error: "pilot_err_parse_error",
  };
  return map[reason];
}

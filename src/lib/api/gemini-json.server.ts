import { z } from "zod";

import { resolveGeminiApiKey } from "@/lib/gemini/resolve-gemini-key.server";

export async function callGeminiJson<T>(
  prompt: string,
  schema: z.ZodType<T>,
  fallback: T,
  options?: { temperature?: number; timeoutMs?: number; apiKey?: string | null },
): Promise<T> {
  const geminiApiKey = resolveGeminiApiKey(options?.apiKey);
  if (!geminiApiKey) return fallback;

  try {
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          responseMimeType: "application/json",
          temperature: options?.temperature ?? 0.15,
        },
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 30_000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return fallback;
    const parsed = schema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

export async function callGeminiText(
  prompt: string,
  fallback: string,
  options?: { temperature?: number; timeoutMs?: number; apiKey?: string | null },
): Promise<string> {
  const geminiApiKey = resolveGeminiApiKey(options?.apiKey);
  if (!geminiApiKey) return fallback;

  try {
    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: {
          temperature: options?.temperature ?? 0.35,
        },
        contents: [{ parts: [{ text: prompt }] }],
      }),
      signal: AbortSignal.timeout(options?.timeoutMs ?? 45_000),
    });
    if (!res.ok) return fallback;
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text && text.length > 80 ? text : fallback;
  } catch {
    return fallback;
  }
}

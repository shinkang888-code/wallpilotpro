import { getServerConfig } from "@/lib/config.server";
import type { ConstitutionRole } from "@/lib/office/constitution";

export type LlmVendor = "openai" | "gemini";

export type LlmRoute = {
  primary: LlmVendor;
  fallback: LlmVendor;
  primaryModel: string;
  fallbackModel: string;
};

const OPENAI_MODEL = "gpt-4o-mini";
const GEMINI_MODEL = "gemini-2.5-flash";

/** 특허 EP-0011: 역할별 비대칭 Primary/Fallback 매트릭스 */
export function resolveLlmRoute(role?: string | null): LlmRoute {
  const r = (role ?? "operator") as ConstitutionRole;
  if (r === "director" || r === "reviewer") {
    return {
      primary: "openai",
      fallback: "gemini",
      primaryModel: OPENAI_MODEL,
      fallbackModel: GEMINI_MODEL,
    };
  }
  if (r === "researcher" || r === "marketer") {
    return {
      primary: "gemini",
      fallback: "openai",
      primaryModel: GEMINI_MODEL,
      fallbackModel: OPENAI_MODEL,
    };
  }
  return {
    primary: "gemini",
    fallback: "openai",
    primaryModel: GEMINI_MODEL,
    fallbackModel: OPENAI_MODEL,
  };
}

export type StructuredChatSchema = {
  summary?: string;
  body?: string;
  links?: Array<{ label: string; url: string }>;
};

const CHAT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    body: { type: "string" },
    links: {
      type: "array",
      items: {
        type: "object",
        properties: { label: { type: "string" }, url: { type: "string" } },
        required: ["label", "url"],
      },
    },
  },
  required: ["summary", "body"],
};

export type OfficeChatTurn = {
  role: "user" | "assistant";
  content: string;
};

async function callGeminiJson<T>(
  system: string,
  userMessage: string,
  history: OfficeChatTurn[],
  schema: Record<string, unknown>,
  apiKey: string,
  model: string,
): Promise<T | null> {
  const contents = [
    ...history.map((turn) => ({
      role: turn.role === "user" ? "user" : "model",
      parts: [{ text: turn.content }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      }),
      signal: AbortSignal.timeout(90_000),
    },
  );

  if (!res.ok) return null;
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function callOpenAiJson<T>(
  system: string,
  userMessage: string,
  history: OfficeChatTurn[],
  apiKey: string,
  model: string,
): Promise<T | null> {
  const messages = [
    { role: "system" as const, content: system },
    ...history.map((turn) => ({
      role: turn.role === "user" ? ("user" as const) : ("assistant" as const),
      content: turn.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: "json_object" },
      messages,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json?.choices?.[0]?.message?.content ?? "";
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export type HybridLlmResult<T> = {
  data: T | null;
  vendor: LlmVendor | null;
  usedFallback: boolean;
};

export async function hybridStructuredChat(input: {
  system: string;
  userMessage: string;
  history?: OfficeChatTurn[];
  constitutionRole?: string | null;
  geminiApiKey?: string | null;
  openaiApiKey?: string | null;
}): Promise<HybridLlmResult<StructuredChatSchema>> {
  const cfg = getServerConfig();
  const route = resolveLlmRoute(input.constitutionRole);
  const history = input.history ?? [];

  const keys: Record<LlmVendor, string> = {
    gemini: input.geminiApiKey?.trim() || cfg.geminiApiKey,
    openai: input.openaiApiKey?.trim() || cfg.openaiApiKey,
  };

  async function tryVendor(vendor: LlmVendor, model: string) {
    const key = keys[vendor];
    if (!key) return null;
    if (vendor === "gemini") {
      return callGeminiJson<StructuredChatSchema>(
        input.system,
        input.userMessage,
        history,
        CHAT_SCHEMA,
        key,
        model,
      );
    }
    return callOpenAiJson<StructuredChatSchema>(
      input.system,
      input.userMessage,
      history,
      key,
      model,
    );
  }

  const primary = await tryVendor(route.primary, route.primaryModel);
  if (primary?.summary || primary?.body) {
    return { data: primary, vendor: route.primary, usedFallback: false };
  }

  const fallback = await tryVendor(route.fallback, route.fallbackModel);
  if (fallback?.summary || fallback?.body) {
    return { data: fallback, vendor: route.fallback, usedFallback: true };
  }

  return { data: null, vendor: null, usedFallback: false };
}

import { z } from "zod";

import {
  buildAiPilotDirectSystemPrompt,
  buildAiPilotDirectUserTurn,
} from "@/lib/ai/ai-pilot-direct-prompt.server";
import {
  buildAiPilotWallStreetSystemPrompt,
  buildAiPilotWallStreetUserTurn,
} from "@/lib/ai/ai-pilot-wallstreet-prompt.server";
import {
  AI_PILOT_GEMINI_SCHEMA,
  GEMINI_PILOT_MODELS,
} from "@/lib/gemini/gemini-pilot-schema.server";
import type { GeminiErrorReason } from "@/lib/gemini/gemini-key-resolution";
import { getGeminiKeyBundle } from "@/lib/gemini/resolve-gemini-key.server";
import type { AiPilotDeepAnalysis, AiPilotPick, AiPilotResponse } from "@/lib/types/ai-pilot";

const pickSchema = z.object({
  rank: z.number().optional().default(0),
  ticker: z.string(),
  name: z.string().optional().default(""),
  market: z.enum(["KR", "US"]).optional().default("US"),
  price_band: z.string().optional().default(""),
  entry_band: z.string().optional().default(""),
  stop_loss: z.string().optional().default(""),
  target_price: z.string().optional().default(""),
  catalyst_timeline: z.string().optional().default(""),
  thesis: z.string().optional().default(""),
  cash_flow_note: z.string().optional().default(""),
  match_points: z.array(z.string()).max(8).optional().default([]),
});

const deepAnalysisSchema = z.object({
  ticker: z.string().optional().default(""),
  name: z.string().optional().default(""),
  market: z.enum(["KR", "US"]).optional().default("US"),
  price_now: z.string().optional().default(""),
  range_52w: z.string().optional().default(""),
  analyst_target: z.string().optional().default(""),
  volatility_drivers: z.array(z.string()).max(8).optional().default([]),
  reverse_check: z.array(z.string()).max(8).optional().default([]),
  ascii_chart: z.string().optional().default(""),
  trade_setup: z
    .object({
      entry_zone: z.string().optional().default(""),
      stop_loss: z.string().optional().default(""),
      short_target: z.string().optional().default(""),
      mid_target: z.string().optional().default(""),
      long_target: z.string().optional().default(""),
    })
    .optional()
    .default({}),
  final_verdict: z.string().optional().default(""),
});

const responseSchema = z.object({
  headline: z.string().optional().default(""),
  prose: z.string().optional().default(""),
  intent: z
    .enum(["stock_picks", "ranking", "strategy", "explain", "general", "single_stock"])
    .optional()
    .default("general"),
  picks: z.array(pickSchema).max(15).optional(),
  ranking_note: z.string().optional(),
  action_plan: z
    .object({
      aggressive: z.string().optional().default(""),
      conservative: z.string().optional().default(""),
    })
    .optional(),
  deep_analysis: deepAnalysisSchema.optional(),
  follow_ups: z.array(z.string()).max(6).optional().default([]),
  disclaimer: z.string().optional().default(""),
});

function mapPick(p: z.infer<typeof pickSchema>): AiPilotPick {
  return {
    rank: p.rank,
    ticker: p.ticker,
    name: p.name,
    market: p.market,
    priceBand: p.price_band,
    entryBand: p.entry_band,
    stopLoss: p.stop_loss,
    targetPrice: p.target_price,
    catalystTimeline: p.catalyst_timeline,
    thesis: p.thesis,
    cashFlowNote: p.cash_flow_note,
    matchPoints: p.match_points,
  };
}

function mapDeepAnalysis(d: z.infer<typeof deepAnalysisSchema>): AiPilotDeepAnalysis {
  return {
    ticker: d.ticker,
    name: d.name,
    market: d.market,
    priceNow: d.price_now,
    range52w: d.range_52w,
    analystTarget: d.analyst_target,
    volatilityDrivers: d.volatility_drivers,
    reverseCheck: d.reverse_check,
    asciiChart: d.ascii_chart,
    tradeSetup: {
      entryZone: d.trade_setup?.entry_zone ?? "",
      stopLoss: d.trade_setup?.stop_loss ?? "",
      shortTarget: d.trade_setup?.short_target ?? "",
      midTarget: d.trade_setup?.mid_target ?? "",
      longTarget: d.trade_setup?.long_target ?? "",
    },
    finalVerdict: d.final_verdict,
  };
}

function mapResponse(raw: z.infer<typeof responseSchema>, directAnswer: string): AiPilotResponse {
  const headline =
    raw.headline?.trim() ||
    (raw.picks?.length
      ? raw.picks.map((p) => p.name || p.ticker).slice(0, 3).join(", ")
      : directAnswer.slice(0, 80));
  const prose = raw.prose?.trim() || directAnswer.slice(0, 2000);
  return {
    directAnswer,
    headline,
    prose,
    intent: raw.intent,
    picks: raw.picks?.map(mapPick),
    rankingNote: raw.ranking_note,
    actionPlan: raw.action_plan,
    deepAnalysis: raw.deep_analysis ? mapDeepAnalysis(raw.deep_analysis) : undefined,
    followUps: raw.follow_ups,
    disclaimer: raw.disclaimer,
  };
}

function extractJsonText(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) return JSON.parse(fenced[1].trim());
    throw new Error("invalid_json");
  }
}

function isGeminiAuthError(status: number): boolean {
  return status === 400 || status === 401 || status === 403;
}

type TextCallResult =
  | { ok: true; text: string }
  | { ok: false; authInvalid: boolean; detail: string };

type StructuredCallResult =
  | { ok: true; data: AiPilotResponse }
  | { ok: false; authInvalid: boolean; parseError: boolean; detail: string };

/** Pass 1: plain Gemini — no JSON schema, optional Google Search grounding. */
async function invokeGeminiDirect(
  key: string,
  systemPrompt: string,
  userPrompt: string,
): Promise<TextCallResult> {
  let lastDetail = "unknown";
  let sawAuthError = false;

  const directModels = ["gemini-2.0-flash", "gemini-2.5-flash", "gemini-1.5-flash"] as const;

  for (const model of directModels) {
    for (const useSearch of [true, false] as const) {
      for (const useSystemInstruction of [true, false] as const) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
          const generationConfig = { temperature: 0.75, topP: 0.95, maxOutputTokens: 8192 };
          const tools = useSearch ? [{ google_search: {} }] : undefined;

          const body = useSystemInstruction
            ? {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig,
                ...(tools ? { tools } : {}),
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              }
            : {
                generationConfig,
                ...(tools ? { tools } : {}),
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
                  },
                ],
              };

          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(50_000),
          });

          if (!res.ok) {
            const errBody = await res.text();
            lastDetail = `${model}${useSearch ? "+search" : ""}: HTTP ${res.status} — ${errBody.slice(0, 160)}`;
            if (isGeminiAuthError(res.status)) sawAuthError = true;
            continue;
          }

          const json = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (text && text.length > 20) {
            return { ok: true, text };
          }
          lastDetail = `${model}: empty or too short response`;
        } catch (err) {
          lastDetail = `${model}: ${err instanceof Error ? err.message : "request failed"}`;
        }
      }
    }
  }

  return { ok: false, authInvalid: sawAuthError, detail: lastDetail };
}

/** Pass 2: WallPilot structured JSON — anchored to direct answer. */
async function invokeGeminiWallStreet(
  key: string,
  systemPrompt: string,
  userPrompt: string,
  directAnswer: string,
): Promise<StructuredCallResult> {
  let lastDetail = "unknown";
  let sawAuthError = false;
  let sawParseError = false;

  for (const model of GEMINI_PILOT_MODELS) {
    for (const useSchema of [true, false] as const) {
      for (const useSystemInstruction of [true, false] as const) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
          const generationConfig = useSchema
            ? {
                responseMimeType: "application/json",
                responseSchema: AI_PILOT_GEMINI_SCHEMA,
                temperature: 0.55,
                topP: 0.92,
                maxOutputTokens: 8192,
              }
            : {
                responseMimeType: "application/json",
                temperature: 0.65,
                topP: 0.95,
                maxOutputTokens: 8192,
              };
          const body = useSystemInstruction
            ? {
                systemInstruction: { parts: [{ text: systemPrompt }] },
                generationConfig,
                contents: [{ role: "user", parts: [{ text: userPrompt }] }],
              }
            : {
                generationConfig,
                contents: [
                  {
                    role: "user",
                    parts: [{ text: `${systemPrompt}\n\n---\n\n${userPrompt}` }],
                  },
                ],
              };

        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45_000),
        });

        if (!res.ok) {
          const errBody = await res.text();
          lastDetail = `${model}: HTTP ${res.status} — ${errBody.slice(0, 180)}`;
          if (isGeminiAuthError(res.status)) sawAuthError = true;
          continue;
        }

        const json = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
          lastDetail = `${model}: empty candidates`;
          continue;
        }

        try {
          const raw = extractJsonText(text);
          const parsed = responseSchema.safeParse(raw);
          if (parsed.success) {
            return { ok: true, data: mapResponse(parsed.data, directAnswer) };
          }
          sawParseError = true;
          lastDetail = `${model}: ${parsed.error.issues[0]?.message ?? "schema mismatch"}`;
        } catch (err) {
          sawParseError = true;
          lastDetail = `${model}: ${err instanceof Error ? err.message : "invalid_json"}`;
        }
        } catch (err) {
          lastDetail = `${model}: ${err instanceof Error ? err.message : "request failed"}`;
        }
      }
    }
  }

  return {
    ok: false,
    authInvalid: sawAuthError,
    parseError: sawParseError,
    detail: lastDetail,
  };
}

function wallStreetFallbackFromDirect(
  directAnswer: string,
  lang: "ko" | "en",
): AiPilotResponse {
  return {
    directAnswer,
    headline: lang === "ko" ? "월가 분석 (형식 변환 실패 — 직접 답변 참고)" : "Wall St. view (format fallback — see direct answer)",
    prose:
      lang === "ko"
        ? "구조화된 월가 분석 생성에 실패했습니다. 위 **직접 답변**을 기준으로 판단하세요.\n\n" +
          directAnswer.slice(0, 800) +
          (directAnswer.length > 800 ? "…" : "")
        : "Structured Wall St. formatting failed. Rely on the **direct answer** above.\n\n" +
          directAnswer.slice(0, 800),
    intent: "general",
    followUps: [],
    disclaimer:
      lang === "ko" ? "연구 목적이며 투자 조언이 아닙니다." : "For research only — not investment advice.",
  };
}

export type DualTrackResult =
  | { ok: true; data: AiPilotResponse }
  | { ok: false; reason: GeminiErrorReason; detail?: string };

async function runWithKey(
  key: string,
  input: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    lang: "ko" | "en";
    scanContext?: { shortSqueeze: import("@/lib/types/stock").StockRow[]; highCash: import("@/lib/types/stock").StockRow[] } | null;
    groundedBlock: string;
    deepBlock: string;
  },
): Promise<DualTrackResult> {
  const latest = input.messages.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const history = input.messages.slice(0, -1);

  const directSystem = buildAiPilotDirectSystemPrompt(input.lang);
  const directUser = buildAiPilotDirectUserTurn(
    history,
    latest,
    input.groundedBlock,
    input.deepBlock,
  );

  const direct = await invokeGeminiDirect(key, directSystem, directUser);
  if (!direct.ok) {
    return {
      ok: false,
      reason: direct.authInvalid ? "vercel_key_invalid" : "parse_error",
      detail: direct.detail,
    };
  }

  const wsSystem = buildAiPilotWallStreetSystemPrompt(input.lang, input.scanContext);
  const wsUser = buildAiPilotWallStreetUserTurn(
    history,
    latest,
    direct.text,
    input.groundedBlock,
    input.deepBlock,
  );

  const structured = await invokeGeminiWallStreet(key, wsSystem, wsUser, direct.text);
  if (structured.ok) return structured;

  return {
    ok: true,
    data: wallStreetFallbackFromDirect(direct.text, input.lang),
  };
}

export async function runDualTrackAiPilot(input: {
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  lang: "ko" | "en";
  scanContext?: { shortSqueeze: import("@/lib/types/stock").StockRow[]; highCash: import("@/lib/types/stock").StockRow[] } | null;
  groundedBlock: string;
  deepBlock: string;
  geminiApiKey?: string | null;
}): Promise<DualTrackResult> {
  const bundle = getGeminiKeyBundle(input.geminiApiKey);
  if (!bundle.vercelUsable && !bundle.clientUsable) {
    return { ok: false, reason: "no_key" };
  }

  if (bundle.vercelUsable) {
    const vercelAttempt = await runWithKey(bundle.vercelKey, input);
    if (vercelAttempt.ok) return vercelAttempt;

    const canFallback =
      bundle.clientUsable && bundle.clientKey !== bundle.vercelKey && vercelAttempt.reason === "vercel_key_invalid";

    if (canFallback) {
      const clientAttempt = await runWithKey(bundle.clientKey, input);
      if (clientAttempt.ok) return clientAttempt;
      if (clientAttempt.reason === "vercel_key_invalid" || clientAttempt.reason === "client_key_invalid") {
        return { ok: false, reason: "client_key_invalid", detail: clientAttempt.detail };
      }
      return clientAttempt;
    }

    if (vercelAttempt.reason === "vercel_key_invalid") {
      return { ok: false, reason: "vercel_key_invalid", detail: vercelAttempt.detail };
    }
    if (vercelAttempt.reason === "parse_error") {
      return {
        ok: true,
        data: wallStreetFallbackFromDirect(
          input.lang === "ko"
            ? "WallPilot AI가 응답을 생성했으나 형식 변환에 실패했습니다. 위 직접 답변을 참고하거나 질문을 다시 시도해 주세요."
            : "WallPilot AI returned content but formatting failed. See the direct answer or retry.",
          input.lang,
        ),
      };
    }
    return vercelAttempt;
  }

  const clientAttempt = await runWithKey(bundle.clientKey, input);
  if (clientAttempt.ok) return clientAttempt;
  if (clientAttempt.reason === "vercel_key_invalid" || clientAttempt.reason === "client_key_invalid") {
    return { ok: false, reason: "client_key_invalid", detail: clientAttempt.detail };
  }
  if (clientAttempt.reason === "parse_error") {
    return {
      ok: true,
      data: wallStreetFallbackFromDirect(
        input.lang === "ko"
          ? "WallPilot AI 분석을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요."
          : "WallPilot AI could not complete the analysis. Please try again.",
        input.lang,
      ),
    };
  }
  return clientAttempt;
}

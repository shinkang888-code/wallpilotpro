import { getServerConfig } from "@/lib/config.server";
import { isGeminiKeyAvailable, resolveGeminiKeySource } from "@/lib/gemini/resolve-gemini-key.server";
import type { TradingAgentsStatus } from "@/lib/modules/ta/types";

const HEALTH_TIMEOUT_MS = 6_000;

function sidecarBaseUrl(): string | null {
  const { tradingAgentsServiceUrl } = getServerConfig();
  return tradingAgentsServiceUrl?.replace(/\/$/, "") || null;
}

function maskHost(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export async function checkTradingAgentsSidecar(): Promise<Pick<
  TradingAgentsStatus,
  "sidecarConfigured" | "sidecarHost" | "sidecarOnline" | "sidecarLatencyMs"
>> {
  const base = sidecarBaseUrl();
  if (!base) {
    return { sidecarConfigured: false, sidecarHost: null, sidecarOnline: false, sidecarLatencyMs: null };
  }

  const started = Date.now();
  try {
    const res = await fetch(`${base}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        sidecarConfigured: true,
        sidecarHost: maskHost(base),
        sidecarOnline: false,
        sidecarLatencyMs: latencyMs,
      };
    }
    const json = (await res.json()) as { status?: string };
    return {
      sidecarConfigured: true,
      sidecarHost: maskHost(base),
      sidecarOnline: json.status === "ok",
      sidecarLatencyMs: latencyMs,
    };
  } catch {
    return {
      sidecarConfigured: true,
      sidecarHost: maskHost(base),
      sidecarOnline: false,
      sidecarLatencyMs: null,
    };
  }
}

export async function getTradingAgentsStatus(geminiApiKey?: string | null): Promise<TradingAgentsStatus> {
  const { geminiApiKey: serverGemini, tradingAgentsServiceUrl } = getServerConfig();
  const sidecar = await checkTradingAgentsSidecar();

  return {
    ...sidecar,
    sidecarHost: sidecar.sidecarHost ?? (tradingAgentsServiceUrl ? maskHost(tradingAgentsServiceUrl) : null),
    serverGeminiConfigured: Boolean(serverGemini.trim()),
    serverOpenaiConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
    geminiConfigured: isGeminiKeyAvailable(geminiApiKey),
    geminiSource: resolveGeminiKeySource(geminiApiKey),
  };
}

export type TradingAgentsEngine = "auto" | "sidecar" | "ts";

export type TradingAgentsStatus = {
  sidecarConfigured: boolean;
  sidecarHost: string | null;
  sidecarOnline: boolean;
  sidecarLatencyMs: number | null;
  serverGeminiConfigured: boolean;
  serverOpenaiConfigured: boolean;
  geminiConfigured: boolean;
  geminiSource: "vercel" | "local" | "none";
};

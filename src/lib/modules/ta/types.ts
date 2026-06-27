export type AgentDeskEngine = "auto" | "sidecar" | "ts";

export type AgentDeskStatus = {
  sidecarConfigured: boolean;
  sidecarHost: string | null;
  sidecarOnline: boolean;
  sidecarLatencyMs: number | null;
  serverGeminiConfigured: boolean;
  serverOpenaiConfigured: boolean;
  geminiConfigured: boolean;
  geminiSource: "vercel" | "local" | "none";
};

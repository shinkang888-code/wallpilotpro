import { generateDeepReportKorean } from "@/lib/agents/deep-report-ko.server";
import { runTradingAgentsPipeline } from "@/lib/agents/tradingagents-pipeline.server";
import { getServerConfig } from "@/lib/config.server";
import { buildWallStreetReportContext } from "@/lib/quant/wall-street-report.server";
import type { DeepAgentReport } from "@/lib/types/stock";

const EXTERNAL_TIMEOUT_MS = 12_000;

async function fetchExternalTradingAgentsReport(
  ticker: string,
  date?: string,
): Promise<{ markdown: string; rating?: string } | null> {
  const { tradingAgentsServiceUrl } = getServerConfig();
  if (!tradingAgentsServiceUrl) return null;

  try {
    const res = await fetch(`${tradingAgentsServiceUrl.replace(/\/$/, "")}/propagate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, date: date ?? new Date().toISOString().slice(0, 10) }),
      signal: AbortSignal.timeout(EXTERNAL_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { markdown?: string; rating?: string; error?: string };
    if (json.error || !json.markdown?.trim()) return null;
    return { markdown: json.markdown.trim(), rating: json.rating };
  } catch {
    return null;
  }
}

/** Phase 2 — TradingAgents pipeline (Python sidecar optional, TS primary). */
export async function buildDeepAgentReport(
  tickerInput: string,
  geminiApiKey?: string | null,
): Promise<DeepAgentReport> {
  const [ctx, external] = await Promise.all([
    buildWallStreetReportContext(tickerInput, undefined, { geminiApiKey }),
    fetchExternalTradingAgentsReport(tickerInput),
  ]);

  const pipeline = await runTradingAgentsPipeline(ctx, geminiApiKey);
  const { report } = ctx;
  const { debate, riskGate, portfolio, markdown: pipelineMarkdown } = pipeline;

  const markdown = external?.markdown ?? pipelineMarkdown;
  const rating = external?.rating
    ? (external.rating as DeepAgentReport["rating"])
    : portfolio.rating;

  const markdownKo = await generateDeepReportKorean({
    report: { ...report, rating },
    debate,
    riskGate,
    markdownEn: markdown,
    geminiApiKey,
  });

  return {
    ...report,
    rating,
    debate,
    riskGate,
    markdown,
    markdownKo,
    source: external ? "tradingagents-ms" : "wallpilot-ts",
  };
}

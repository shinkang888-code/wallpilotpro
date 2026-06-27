import { generateAgentDeskLocalizedKo } from "@/lib/agents/deep-report-localized-ko.server";
import { generateDeepReportKorean } from "@/lib/agents/deep-report-ko.server";
import { runAgentDeskPipeline } from "@/lib/agents/deep-report-pipeline.server";
import { getServerConfig } from "@/lib/config.server";
import type { AgentDeskEngine } from "@/lib/modules/ta/types";
import { buildWallStreetReportContext } from "@/lib/quant/wall-street-report.server";
import type { DeepAgentReport } from "@/lib/types/stock";

const EXTERNAL_TIMEOUT_MS = 45_000;

async function fetchExternalAgentReport(
  ticker: string,
  date: string,
  enabled: boolean,
): Promise<{ markdown: string; rating?: string } | null> {
  if (!enabled) return null;
  const { agentServiceUrl } = getServerConfig();
  if (!agentServiceUrl) return null;

  try {
    const res = await fetch(`${agentServiceUrl.replace(/\/$/, "")}/propagate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticker, date }),
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

/** WallPilot Agent Desk — optional Python sidecar, TS pipeline primary. */
export async function buildDeepAgentReport(
  tickerInput: string,
  geminiApiKey?: string | null,
  options?: { analysisDate?: string; engine?: AgentDeskEngine },
): Promise<DeepAgentReport> {
  const analysisDate = options?.analysisDate ?? new Date().toISOString().slice(0, 10);
  const engine = options?.engine ?? "auto";
  const useSidecar = engine === "auto" || engine === "sidecar";

  const [ctx, external] = await Promise.all([
    buildWallStreetReportContext(tickerInput, undefined, { geminiApiKey }),
    fetchExternalAgentReport(tickerInput, analysisDate, useSidecar),
  ]);

  if (engine === "sidecar" && !external) {
    throw new Error("agent_desk_sidecar_unavailable");
  }

  const pipeline = await runAgentDeskPipeline(ctx, geminiApiKey);
  const { report } = ctx;
  const { analysts, debate, trader, riskGate, portfolio, markdown: pipelineMarkdown } = pipeline;

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

  const localizedKo = await generateAgentDeskLocalizedKo({
    report: { ...report, rating },
    analysts,
    debate,
    trader,
    riskGate,
    portfolio,
    geminiApiKey,
  });

  return {
    ...report,
    rating,
    debate,
    riskGate,
    analysts,
    trader,
    portfolio,
    analysisDate,
    markdown,
    markdownKo,
    localizedKo,
    source: external ? "wallpilot-ms" : "wallpilot-ts",
  };
}

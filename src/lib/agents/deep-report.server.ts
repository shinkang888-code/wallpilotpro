import type { DebateVerdict } from "@/lib/agents/debate.server";
import { runMiniDebate } from "@/lib/agents/debate.server";
import type { RiskGateResult } from "@/lib/agents/risk-gate.server";
import { riskGateBeforeOrder } from "@/lib/agents/risk-gate.server";
import { getServerConfig } from "@/lib/config.server";
import { toStockRow, type AnalyzedRow } from "@/lib/quant/classify.server";
import { buildWallStreetReportContext } from "@/lib/quant/wall-street-report.server";
import { generateDeepReportKorean } from "@/lib/agents/deep-report-ko.server";
import type { DeepAgentReport, WallStreetReport } from "@/lib/types/stock";

function renderMarkdown(
  report: WallStreetReport,
  debate: DebateVerdict,
  risk: RiskGateResult,
): string {
  return `# ${report.name} (${report.ticker}) — Deep Agent Report

**Rating:** ${debate.rating} · **Combined:** ${report.combined.recommendation}
**Price:** ${report.price} · **Fair Value:** ${report.combined.fairValue}
**Technical:** ${report.technicalLabel}

## Bull Case
${debate.bullCase}

## Bear Case
${debate.bearCase}

## Research Manager Verdict
${debate.verdict}

## Risk Gate
- **Approved:** ${risk.approved ? "Yes" : "No"}
- **Aggressive:** ${risk.aggressiveView}
- **Conservative:** ${risk.conservativeView}
- **Reason:** ${risk.reason}

## Catalysts
${report.catalysts.map((c) => `- ${c}`).join("\n")}
`;
}

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
      signal: AbortSignal.timeout(120_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { markdown?: string; rating?: string };
    if (!json.markdown) return null;
    return { markdown: json.markdown, rating: json.rating };
  } catch {
    return null;
  }
}

/** Phase 3 — single-ticker deep pipeline (internal TS or external TradingAgents MS). */
export async function buildDeepAgentReport(
  tickerInput: string,
  geminiApiKey?: string | null,
): Promise<DeepAgentReport> {
  const external = await fetchExternalTradingAgentsReport(tickerInput);
  const ctx = await buildWallStreetReportContext(tickerInput, undefined, { geminiApiKey });
  const { snapshot, valuation, news, gemini, report } = ctx;

  const debate = await runMiniDebate({
    snapshot,
    valuation,
    news,
    initialRating: gemini.rating,
    geminiApiKey,
  });

  const analyzed: AnalyzedRow = {
    snapshot,
    valuation,
    catalysts: report.catalysts,
    rating: debate.rating,
    debate,
  };
  const stockRow = toStockRow(analyzed);
  const riskGate = await riskGateBeforeOrder(stockRow, null);

  const markdown = external?.markdown ?? renderMarkdown(report, debate, riskGate);
  const markdownKo = await generateDeepReportKorean({
    report,
    debate,
    riskGate,
    markdownEn: markdown,
    geminiApiKey,
  });

  return {
    ...report,
    rating: debate.rating,
    debate,
    riskGate,
    markdown,
    markdownKo,
    source: external ? "tradingagents-ms" : "wallpilot-ts",
  };
}

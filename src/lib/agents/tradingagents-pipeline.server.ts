import { z } from "zod";

import { callGeminiJson } from "@/lib/api/gemini-json.server";
import { formatNewsForPrompt, type NewsHeadline } from "@/lib/api/news-data.server";
import { runMiniDebate } from "@/lib/agents/debate.server";
import { riskGateBeforeOrder } from "@/lib/agents/risk-gate.server";
import { toStockRow } from "@/lib/quant/classify.server";
import type { WallStreetReportContext } from "@/lib/quant/wall-street-report.server";
import type { DebateVerdict, RiskGateResult } from "@/lib/types/agent";
import { coercePortfolioRating, PORTFOLIO_RATINGS, type PortfolioRating } from "@/lib/types/rating";
import type { RawMarketSnapshot, ValuationResult } from "@/lib/types/stock";

export type AnalystReports = {
  market: string;
  fundamentals: string;
  news: string;
  sentiment: string;
};

export type TraderProposal = {
  action: "Buy" | "Hold" | "Sell";
  reasoning: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  positionSizing?: string | null;
};

export type PortfolioDecision = {
  rating: PortfolioRating;
  executiveSummary: string;
  investmentThesis: string;
  priceTarget?: number | null;
  timeHorizon?: string | null;
};

export type TradingAgentsPipelineResult = {
  analysts: AnalystReports;
  debate: DebateVerdict;
  trader: TraderProposal;
  riskGate: RiskGateResult;
  portfolio: PortfolioDecision;
  markdown: string;
};

const analystSchema = z.object({
  market_report: z.string().min(80).max(1200),
  fundamentals_report: z.string().min(80).max(1200),
  news_report: z.string().min(80).max(1200),
  sentiment_report: z.string().min(80).max(1200),
});

const traderPmSchema = z.object({
  action: z.enum(["Buy", "Hold", "Sell"]),
  trader_reasoning: z.string().min(40).max(500),
  entry_price: z.number().nullable().optional(),
  stop_loss: z.number().nullable().optional(),
  position_sizing: z.string().nullable().optional(),
  rating: z.enum(PORTFOLIO_RATINGS),
  executive_summary: z.string().min(40).max(500),
  investment_thesis: z.string().min(80).max(900),
  price_target: z.number().nullable().optional(),
  time_horizon: z.string().nullable().optional(),
});

function fallbackAnalystReports(
  snapshot: RawMarketSnapshot,
  valuation: ValuationResult,
  news: NewsHeadline[],
  report: WallStreetReportContext["report"],
): AnalystReports {
  const tech = snapshot.technical?.label ?? "N/A";
  return {
    market: `Price ${snapshot.price} ${snapshot.currency}, 30D change ${snapshot.change30dPct.toFixed(1)}%. Technical: ${tech}. Momentum score ${valuation.momentum}. Volume outlook: ${valuation.volPrediction}.`,
    fundamentals: `Intrinsic ${valuation.intrinsicValue}, MOS ${valuation.marginOfSafetyPct.toFixed(1)}%, PEG ${valuation.pegRatio ?? "N/A"}, quant grade ${valuation.quantitativeGrade}. Lynch ${report.lynch.recommendation} (PEG ${report.lynch.pegRatio}). Greenblatt ${report.greenblatt.recommendation} (ROIC ${report.greenblatt.roic}%).`,
    news: news.length
      ? news.map((n) => `- ${n.title}`).join("\n")
      : "No major headlines in the last session; price action driven by sector beta.",
    sentiment: `${report.supply.label}. Combined desk view: ${report.combined.recommendation}. Catalysts: ${report.catalysts.slice(0, 3).join("; ") || "none flagged"}.`,
  };
}

export async function buildAnalystReports(
  ctx: WallStreetReportContext,
  geminiApiKey?: string | null,
): Promise<AnalystReports> {
  const { snapshot, valuation, news, report } = ctx;
  const fallback = fallbackAnalystReports(snapshot, valuation, news, report);

  const prompt = `You are four TradingAgents analysts (Market, Fundamentals, News, Social/Sentiment) writing concise desk reports.
Use ONLY the data below. Each report: 3-5 sentences, plain prose, no markdown headers.

Ticker: ${snapshot.ticker} (${snapshot.name}) · ${snapshot.market}
Price: ${snapshot.price} ${snapshot.currency} · 30D: ${snapshot.change30dPct.toFixed(1)}%
Intrinsic: ${valuation.intrinsicValue} · MOS: ${valuation.marginOfSafetyPct.toFixed(1)}%
PEG: ${valuation.pegRatio ?? "N/A"} · Quant: ${valuation.quantitativeGrade}
Technical: ${snapshot.technical?.label ?? "N/A"}
Lynch: ${report.lynch.recommendation} PEG=${report.lynch.pegRatio}
Greenblatt: ${report.greenblatt.recommendation} ROIC=${report.greenblatt.roic}%
Supply: ${report.supply.label}
News:
${formatNewsForPrompt(news)}

Return JSON:
{"market_report":"...","fundamentals_report":"...","news_report":"...","sentiment_report":"..."}`;

  const raw = await callGeminiJson(prompt, analystSchema, {
    market_report: fallback.market,
    fundamentals_report: fallback.fundamentals,
    news_report: fallback.news,
    sentiment_report: fallback.sentiment,
  }, { apiKey: geminiApiKey, timeoutMs: 22_000 });

  return {
    market: raw.market_report.trim(),
    fundamentals: raw.fundamentals_report.trim(),
    news: raw.news_report.trim(),
    sentiment: raw.sentiment_report.trim(),
  };
}

function renderTraderProposal(trader: TraderProposal): string {
  const parts = [
    `**Action**: ${trader.action}`,
    "",
    `**Reasoning**: ${trader.reasoning}`,
  ];
  if (trader.entryPrice != null) parts.push("", `**Entry Price**: ${trader.entryPrice}`);
  if (trader.stopLoss != null) parts.push("", `**Stop Loss**: ${trader.stopLoss}`);
  if (trader.positionSizing) parts.push("", `**Position Sizing**: ${trader.positionSizing}`);
  parts.push("", `FINAL TRANSACTION PROPOSAL: **${trader.action.toUpperCase()}**`);
  return parts.join("\n");
}

function renderPortfolioDecision(pm: PortfolioDecision): string {
  const parts = [
    `**Rating**: ${pm.rating}`,
    "",
    `**Executive Summary**: ${pm.executiveSummary}`,
    "",
    `**Investment Thesis**: ${pm.investmentThesis}`,
  ];
  if (pm.priceTarget != null) parts.push("", `**Price Target**: ${pm.priceTarget}`);
  if (pm.timeHorizon) parts.push("", `**Time Horizon**: ${pm.timeHorizon}`);
  return parts.join("\n");
}

export function renderTradingAgentsMarkdown(input: {
  ticker: string;
  name: string;
  analysts: AnalystReports;
  debate: DebateVerdict;
  trader: TraderProposal;
  riskGate: RiskGateResult;
  portfolio: PortfolioDecision;
}): string {
  const { ticker, name, analysts, debate, trader, riskGate, portfolio } = input;
  return `# ${name} (${ticker}) — TradingAgents Desk Report

## Market Analyst
${analysts.market}

## Fundamentals Analyst
${analysts.fundamentals}

## News Analyst
${analysts.news}

## Sentiment Analyst
${analysts.sentiment}

## Investment Debate (Bull vs Bear)
### Bull Case
${debate.bullCase}

### Bear Case
${debate.bearCase}

### Research Manager Verdict
${debate.verdict}

## Trader Proposal
${renderTraderProposal(trader)}

## Risk Committee
- **Approved:** ${riskGate.approved ? "Yes" : "No"}
- **Aggressive:** ${riskGate.aggressiveView}
- **Conservative:** ${riskGate.conservativeView}
- **Reason:** ${riskGate.reason}

## Portfolio Manager Decision
${renderPortfolioDecision(portfolio)}
`;
}

async function runTraderAndPortfolio(
  ctx: WallStreetReportContext,
  analysts: AnalystReports,
  debate: DebateVerdict,
  riskGate: RiskGateResult,
  geminiApiKey?: string | null,
): Promise<{ trader: TraderProposal; portfolio: PortfolioDecision }> {
  const { snapshot, valuation, report } = ctx;
  const fallbackTrader: TraderProposal = {
    action: debate.rating === "Sell" || debate.rating === "Underweight" ? "Sell" : debate.rating === "Buy" || debate.rating === "Overweight" ? "Buy" : "Hold",
    reasoning: `Research Manager rated ${debate.rating}. ${debate.verdict}`,
    entryPrice: snapshot.price,
    stopLoss: valuation.hardStop,
    positionSizing: riskGate.approved ? "2-3% of portfolio" : "No new position",
  };
  const fallbackPm: PortfolioDecision = {
    rating: debate.rating,
    executiveSummary: `${debate.rating} — ${report.combined.recommendation}. Risk gate ${riskGate.approved ? "cleared" : "blocked"}.`,
    investmentThesis: debate.verdict,
    priceTarget: report.combined.fairValue,
    timeHorizon: "1-3 months",
  };

  const prompt = `You are TradingAgents Trader + Portfolio Manager (single JSON response).
Read analyst reports, research verdict, and risk gate. Produce trader proposal then PM decision.

Ticker: ${snapshot.ticker} (${snapshot.name})
Price: ${snapshot.price} ${snapshot.currency}
Research rating: ${debate.rating}
Research verdict: ${debate.verdict}
Risk approved: ${riskGate.approved} — ${riskGate.reason}
Buying zone: ${report.combined.buyingZone}
Profit target: ${report.combined.profitTarget}
Hard stop: ${report.combined.hardStop}

Analyst excerpts:
Market: ${analysts.market.slice(0, 300)}
Fundamentals: ${analysts.fundamentals.slice(0, 300)}
News: ${analysts.news.slice(0, 300)}

Return JSON:
{"action":"Buy|Hold|Sell","trader_reasoning":"...","entry_price":null,"stop_loss":null,"position_sizing":"...","rating":"Hold","executive_summary":"...","investment_thesis":"...","price_target":null,"time_horizon":"..."}`;

  const raw = await callGeminiJson(
    prompt,
    traderPmSchema,
    {
      action: fallbackTrader.action,
      trader_reasoning: fallbackTrader.reasoning,
      entry_price: fallbackTrader.entryPrice ?? null,
      stop_loss: fallbackTrader.stopLoss ?? null,
      position_sizing: fallbackTrader.positionSizing ?? null,
      rating: fallbackPm.rating,
      executive_summary: fallbackPm.executiveSummary,
      investment_thesis: fallbackPm.investmentThesis,
      price_target: fallbackPm.priceTarget ?? null,
      time_horizon: fallbackPm.timeHorizon ?? null,
    },
    { apiKey: geminiApiKey, timeoutMs: 22_000 },
  );

  return {
    trader: {
      action: raw.action,
      reasoning: raw.trader_reasoning.trim(),
      entryPrice: raw.entry_price ?? null,
      stopLoss: raw.stop_loss ?? null,
      positionSizing: raw.position_sizing ?? null,
    },
    portfolio: {
      rating: coercePortfolioRating(raw.rating, debate.rating),
      executiveSummary: raw.executive_summary.trim(),
      investmentThesis: raw.investment_thesis.trim(),
      priceTarget: raw.price_target ?? null,
      timeHorizon: raw.time_horizon ?? null,
    },
  };
}

/** Full TradingAgents-style pipeline (TS fallback / primary). */
export async function runTradingAgentsPipeline(
  ctx: WallStreetReportContext,
  geminiApiKey?: string | null,
): Promise<TradingAgentsPipelineResult> {
  const analysts = await buildAnalystReports(ctx, geminiApiKey);

  const debate = await runMiniDebate({
    snapshot: ctx.snapshot,
    valuation: ctx.valuation,
    news: ctx.news,
    initialRating: ctx.gemini.rating,
    geminiApiKey,
  });

  const analyzed = {
    snapshot: ctx.snapshot,
    valuation: ctx.valuation,
    catalysts: ctx.report.catalysts,
    rating: debate.rating,
    debate,
  };
  const stockRow = toStockRow(analyzed);
  const riskGate = await riskGateBeforeOrder(stockRow, null);
  const { trader, portfolio } = await runTraderAndPortfolio(ctx, analysts, debate, riskGate, geminiApiKey);

  const markdown = renderTradingAgentsMarkdown({
    ticker: ctx.report.ticker,
    name: ctx.report.name,
    analysts,
    debate,
    trader,
    riskGate,
    portfolio,
  });

  return { analysts, debate, trader, riskGate, portfolio, markdown };
}

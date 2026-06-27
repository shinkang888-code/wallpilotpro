import { z } from "zod";

import { callGeminiJson } from "@/lib/api/gemini-json.server";
import type { DebateVerdict, RiskGateResult } from "@/lib/types/agent";
import { PORTFOLIO_RATINGS } from "@/lib/types/rating";
import type {
  DeepAgentAnalystReports,
  DeepAgentLocalizedKo,
  DeepAgentPortfolioDecision,
  DeepAgentTraderProposal,
  WallStreetReport,
} from "@/lib/types/stock";

const localizedSchema = z.object({
  analysts: z.object({
    market: z.string().min(40),
    fundamentals: z.string().min(40),
    news: z.string().min(20),
    sentiment: z.string().min(40),
  }),
  debate: z.object({
    bullCase: z.string().min(40),
    bearCase: z.string().min(40),
    verdict: z.string().min(40),
    rating: z.enum(PORTFOLIO_RATINGS),
  }),
  trader: z.object({
    action: z.enum(["Buy", "Hold", "Sell"]),
    reasoning: z.string().min(30),
    entry_price: z.number().nullable().optional(),
    stop_loss: z.number().nullable().optional(),
    position_sizing: z.string().nullable().optional(),
  }),
  risk_gate: z.object({
    approved: z.boolean(),
    reason: z.string().min(20),
    aggressive_view: z.string().min(20),
    conservative_view: z.string().min(20),
  }),
  portfolio: z.object({
    rating: z.enum(PORTFOLIO_RATINGS),
    executive_summary: z.string().min(30),
    investment_thesis: z.string().min(40),
    price_target: z.number().nullable().optional(),
    time_horizon: z.string().nullable().optional(),
  }),
});

type LocalizedJson = z.infer<typeof localizedSchema>;

function mapLocalizedJson(raw: LocalizedJson): DeepAgentLocalizedKo {
  return {
    analysts: raw.analysts,
    debate: raw.debate,
    trader: {
      action: raw.trader.action,
      reasoning: raw.trader.reasoning,
      entryPrice: raw.trader.entry_price ?? null,
      stopLoss: raw.trader.stop_loss ?? null,
      positionSizing: raw.trader.position_sizing ?? null,
    },
    riskGate: {
      approved: raw.risk_gate.approved,
      reason: raw.risk_gate.reason,
      aggressiveView: raw.risk_gate.aggressive_view,
      conservativeView: raw.risk_gate.conservative_view,
    },
    portfolio: {
      rating: raw.portfolio.rating,
      executiveSummary: raw.portfolio.executive_summary,
      investmentThesis: raw.portfolio.investment_thesis,
      priceTarget: raw.portfolio.price_target ?? null,
      timeHorizon: raw.portfolio.time_horizon ?? null,
    },
  };
}

function fallbackLocalizedKo(
  report: WallStreetReport,
  analysts: DeepAgentAnalystReports,
  debate: DebateVerdict,
  trader: DeepAgentTraderProposal,
  riskGate: RiskGateResult,
  portfolio: DeepAgentPortfolioDecision,
): LocalizedJson {
  const price =
    report.currency === "USD"
      ? `$${report.price.toFixed(2)}`
      : `₩${Math.round(report.price).toLocaleString("ko-KR")}`;

  const hasKorean = (text: string) => /[\uac00-\ud7a3]/.test(text);

  return {
    analysts: {
      market: `${report.name}(${report.ticker}) 현재가 ${price}. ${report.technicalLabel ? `기술적 상태: ${report.technicalLabel}. ` : ""}30일 수익률·이동평균·거래량을 기준으로 단기 추세를 요약합니다.`,
      fundamentals: `PEG ${report.lynch.pegRatio.toFixed(2)}, ROIC ${report.greenblatt.roic}%, 안전마진 ${report.combined.marginOfSafetyPct.toFixed(1)}% — 밸류에이션·재무 지표를 종합합니다. ${report.lynch.recommendation} · ${report.greenblatt.recommendation}`,
      news: hasKorean(analysts.news) || analysts.news.includes("headline")
        ? analysts.news
        : `최근 뉴스·공시 흐름: ${analysts.news}`,
      sentiment: `수급·심리: ${report.supply.label}. 종합 견해 ${report.combined.recommendation}. ${analysts.sentiment}`,
    },
    debate: {
      bullCase: `강세: ${report.combined.recommendation}. 안전마진 ${report.combined.marginOfSafetyPct.toFixed(1)}%, PEG ${report.lynch.pegRatio.toFixed(2)}. ${debate.bullCase}`,
      bearCase: `약세: 밸류에이션·거래 변동성 리스크. ${debate.bearCase}`,
      verdict: debate.verdict.startsWith("리서치") || hasKorean(debate.verdict)
        ? debate.verdict
        : `리서치 매니저 판정: ${debate.rating}. ${debate.verdict}`,
      rating: debate.rating,
    },
    trader: {
      action: trader.action,
      reasoning: trader.reasoning.startsWith("매수") || hasKorean(trader.reasoning)
        ? trader.reasoning
        : `매매 견해 ${trader.action}. ${trader.reasoning}`,
      entry_price: trader.entryPrice ?? null,
      stop_loss: trader.stopLoss ?? null,
      position_sizing: trader.positionSizing ?? null,
    },
    risk_gate: {
      approved: riskGate.approved,
      reason: riskGate.approved
        ? `리스크 게이트 통과: ${riskGate.reason}`
        : `리스크 게이트 차단: ${riskGate.reason}`,
      aggressive_view: riskGate.aggressiveView,
      conservative_view: riskGate.conservativeView,
    },
    portfolio: {
      rating: portfolio.rating,
      executive_summary: portfolio.executiveSummary,
      investment_thesis: portfolio.investmentThesis,
      price_target: portfolio.priceTarget ?? null,
      time_horizon: portfolio.timeHorizon ?? null,
    },
  };
}

export async function generateAgentDeskLocalizedKo(input: {
  report: WallStreetReport;
  analysts: DeepAgentAnalystReports;
  debate: DebateVerdict;
  trader: DeepAgentTraderProposal;
  riskGate: RiskGateResult;
  portfolio: DeepAgentPortfolioDecision;
  geminiApiKey?: string | null;
}): Promise<DeepAgentLocalizedKo> {
  const { report, analysts, debate, trader, riskGate, portfolio } = input;
  const fallback = fallbackLocalizedKo(report, analysts, debate, trader, riskGate, portfolio);

  const prompt = `You are a senior Korean equity research desk. Translate the WallPilot Agent Desk pipeline output into natural Korean for UI cards.

Rules:
- Write ONLY in Korean (tickers, company names, numbers may stay as in source).
- Preserve all numbers, prices, percentages, and rating enums (Overweight, Buy, etc.) accurately.
- Each text field: 2-4 sentences, professional but readable for retail investors.
- Do not invent facts not in the source.

Source JSON:
${JSON.stringify(
  {
    analysts,
    debate,
    trader: {
      action: trader.action,
      reasoning: trader.reasoning,
      entry_price: trader.entryPrice,
      stop_loss: trader.stopLoss,
      position_sizing: trader.positionSizing,
    },
    risk_gate: riskGate,
    portfolio: {
      rating: portfolio.rating,
      executive_summary: portfolio.executiveSummary,
      investment_thesis: portfolio.investmentThesis,
      price_target: portfolio.priceTarget,
      time_horizon: portfolio.timeHorizon,
    },
    context: {
      ticker: report.ticker,
      name: report.name,
      price: report.price,
      currency: report.currency,
    },
  },
  null,
  2,
)}

Return JSON with keys: analysts (market, fundamentals, news, sentiment), debate (bullCase, bearCase, verdict, rating), trader (action, reasoning, entry_price, stop_loss, position_sizing), risk_gate (approved, reason, aggressive_view, conservative_view), portfolio (rating, executive_summary, investment_thesis, price_target, time_horizon).`;

  const raw = await callGeminiJson(prompt, localizedSchema, fallback, {
    temperature: 0.25,
    timeoutMs: 25_000,
    apiKey: input.geminiApiKey,
  });

  return mapLocalizedJson(raw);
}

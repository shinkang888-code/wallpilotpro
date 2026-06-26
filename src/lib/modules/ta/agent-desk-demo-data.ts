import type { DeepAgentReport } from "@/lib/types/stock";

const baseReport = {
  ticker: "NVDA",
  name: "NVIDIA",
  market: "US" as const,
  currency: "USD" as const,
  price: 142.5,
  generatedAt: new Date().toISOString(),
  lynch: {
    fairValue: 168,
    pegRatio: 1.2,
    dividendAdjustedPEG: 1.15,
    lynchScore: 82,
    companyType: "Fast Grower",
    recommendation: "Strong growth at reasonable PEG",
    upsidePct: 17.9,
  },
  greenblatt: {
    fairValue: 155,
    roic: 42.1,
    earningsYield: 3.8,
    magicScore: 91,
    comprehensiveScore: 88,
    investmentGrade: "A",
    recommendation: "High ROIC compounder",
    upsidePct: 8.8,
  },
  supply: {
    foreignNetAmount: null,
    institutionNetAmount: null,
    trend: "accumulating" as const,
    label: "Institutional accumulation · AI capex theme",
  },
  combined: {
    fairValue: 162,
    marginOfSafetyPct: 12.1,
    buyingZone: "128 – 138",
    profitTarget: "168 – 185",
    hardStop: "118",
    recommendation: "Overweight on AI datacenter cycle",
  },
  catalysts: ["Blackwell ramp", "Hyperscaler capex", "Margin expansion"],
  rating: "Overweight" as const,
  technicalLabel: "Uptrend · RSI neutral",
};

export const AGENT_DESK_DEMO_REPORT: DeepAgentReport = {
  ...baseReport,
  analysisDate: new Date().toISOString().slice(0, 10),
  source: "tradingagents-ms",
  analysts: {
    market:
      "NVDA trades at $142.5 with 30D momentum +8.2%. Technical structure remains constructive above the 50D MA. Volume confirms institutional participation on pullbacks.",
    fundamentals:
      "Data-center revenue mix exceeds 85% with expanding gross margins. PEG near 1.2x vs AI peer median 1.8x. Quant screen: Pass on ROE and operating leverage.",
    news:
      "Recent headlines focus on next-gen GPU shipments and cloud capex guidance. No material regulatory overhang in the last session.",
    sentiment:
      "Social and news sentiment skew bullish but not euphoric. Supply-demand label: accumulation. Combined desk view supports incremental adds on weakness.",
  },
  debate: {
    bullCase:
      "AI infrastructure spend is still early innings. NVDA maintains CUDA moat and pricing power. Margin of safety above 10% with Overweight quant alignment.",
    bearCase:
      "Valuation embeds perfection; any capex pause or custom ASIC share gain could compress multiples. Concentration risk in mega-cap AI trade.",
    verdict:
      "Research Manager: constructive risk/reward for 1–3 month horizon — maintain Overweight with disciplined sizing.",
    rating: "Overweight",
  },
  trader: {
    action: "Buy",
    reasoning: "Pullback toward buying zone offers favorable entry. Momentum and fundamentals align with Research Overweight.",
    entryPrice: 138,
    stopLoss: 118,
    positionSizing: "2–3% of portfolio per name",
  },
  riskGate: {
    approved: true,
    reason: "Risk checks passed — sizing within concentration guardrails.",
    aggressiveView: "AI capex cycle may extend upside skew into next earnings window.",
    conservativeView: "Hard stop at 118 contains downside; approve with monitoring.",
  },
  portfolio: {
    rating: "Overweight",
    executiveSummary: "Overweight — AI datacenter leader with acceptable margin of safety. Risk gate cleared.",
    investmentThesis:
      "Leadership in accelerated computing with durable software ecosystem. Prefer staggered entry inside buying zone.",
    priceTarget: 168,
    timeHorizon: "1–3 months",
  },
  markdown: "# NVIDIA (NVDA) — TradingAgents Demo Report\n\n## Market Analyst\nDemo pipeline output.",
  markdownKo:
    "## NVIDIA (NVDA) 데모 리포트\n\nTradingAgents Python 사이드카 파이프라인 데모입니다. 실제 분석은 **에이전트 분석 실행**을 사용하세요.",
};

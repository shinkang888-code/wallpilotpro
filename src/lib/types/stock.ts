import type { SupplyTrend } from "@/lib/quant/analyzers/types.server";
import type { DebateVerdict, RiskGateResult } from "@/lib/types/agent";
import type { PortfolioRating } from "@/lib/types/rating";
import type { TechnicalSnapshot } from "@/lib/quant/technical.server";

export type Market = "KR" | "US";
export type Currency = "KRW" | "USD";

export type StockRow = {
  ticker: string;
  name: string;
  market: Market;
  price: number;
  currency: Currency;
  momentum: number;
  buyingZone: string;
  profitTarget: string;
  hardStop: string;
  volPrediction: string;
  catalysts: string[];
  guruBadges: string[];
  rating: PortfolioRating;
  technicalLabel?: string;
  debate?: DebateVerdict | null;
  deepAnalyzed?: boolean;
};

export type TradingPayload = {
  shortSqueeze: StockRow[];
  highCash: StockRow[];
  walletBalance: { krw: number; usd: number } | null;
};

export type ScanToggles = {
  toss: boolean;
  thirteenF: boolean;
  quant: boolean;
};

export type RawMarketSnapshot = {
  ticker: string;
  name: string;
  market: Market;
  currency: Currency;
  price: number;
  change30dPct: number;
  volume: number;
  avgVolume20d: number;
  peRatio: number | null;
  roe: number | null;
  operatingMargin: number | null;
  epsGrowth: number | null;
  cashToMcap: number | null;
  eps?: number | null;
  pbr?: number | null;
  bps?: number | null;
  divYield?: number | null;
  marketCap?: number | null;
  foreignNetAmount?: number | null;
  institutionNetAmount?: number | null;
  individualNetAmount?: number | null;
  supplyTrend?: SupplyTrend | null;
  supplyLabel?: string | null;
  technical?: TechnicalSnapshot | null;
  /** Live price source — Toss when connected, otherwise Yahoo. */
  priceSource?: "toss" | "yahoo";
};

export type ValuationResult = {
  intrinsicValue: number;
  marginOfSafetyPct: number;
  pegRatio: number | null;
  quantitativeGrade: "Pass" | "Fail";
  buyingZoneLow: number;
  buyingZoneHigh: number;
  profitTarget: number;
  hardStop: number;
  volPrediction: string;
  momentum: number;
  lynchScore: number;
  greenblattScore: number;
  lynchRecommendation: string;
  greenblattRecommendation: string;
  greenblattGrade: string;
  guruBadges: string[];
  supplyLabel: string | null;
};

export type WallStreetReport = {
  ticker: string;
  name: string;
  market: Market;
  currency: Currency;
  price: number;
  generatedAt: string;
  lynch: {
    fairValue: number;
    pegRatio: number;
    dividendAdjustedPEG: number;
    lynchScore: number;
    companyType: string;
    recommendation: string;
    upsidePct: number;
  };
  greenblatt: {
    fairValue: number;
    roic: number;
    earningsYield: number;
    magicScore: number;
    comprehensiveScore: number;
    investmentGrade: string;
    recommendation: string;
    upsidePct: number;
  };
  supply: {
    foreignNetAmount: number | null;
    institutionNetAmount: number | null;
    trend: SupplyTrend;
    label: string;
  };
  combined: {
    fairValue: number;
    marginOfSafetyPct: number;
    buyingZone: string;
    profitTarget: string;
    hardStop: string;
    recommendation: string;
  };
  catalysts: string[];
  rating: PortfolioRating;
  technicalLabel: string;
  debate?: DebateVerdict | null;
  riskGate?: RiskGateResult | null;
};

export type DeepAgentAnalystReports = {
  market: string;
  fundamentals: string;
  news: string;
  sentiment: string;
};

export type DeepAgentTraderProposal = {
  action: "Buy" | "Hold" | "Sell";
  reasoning: string;
  entryPrice?: number | null;
  stopLoss?: number | null;
  positionSizing?: string | null;
};

export type DeepAgentPortfolioDecision = {
  rating: PortfolioRating;
  executiveSummary: string;
  investmentThesis: string;
  priceTarget?: number | null;
  timeHorizon?: string | null;
};

export type DeepAgentReport = WallStreetReport & {
  debate: DebateVerdict;
  riskGate: RiskGateResult;
  markdown: string;
  markdownKo: string;
  source: "wallpilot-ts" | "tradingagents-ms";
  analysts: DeepAgentAnalystReports;
  trader: DeepAgentTraderProposal;
  portfolio: DeepAgentPortfolioDecision;
  analysisDate: string;
};

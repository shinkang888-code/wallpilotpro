export type AiPilotRole = "user" | "assistant";

export type AiPilotMessage = {
  id: string;
  role: AiPilotRole;
  content: string;
  response?: AiPilotResponse;
  createdAt: number;
};

export type AiPilotPick = {
  rank: number;
  ticker: string;
  name: string;
  market: "KR" | "US";
  priceBand: string;
  entryBand: string;
  stopLoss: string;
  targetPrice: string;
  catalystTimeline: string;
  thesis: string;
  cashFlowNote: string;
  matchPoints: string[];
};

export type AiPilotDeepAnalysis = {
  ticker: string;
  name: string;
  market: "KR" | "US";
  priceNow: string;
  range52w: string;
  analystTarget: string;
  volatilityDrivers: string[];
  reverseCheck: string[];
  asciiChart: string;
  tradeSetup: {
    entryZone: string;
    stopLoss: string;
    shortTarget: string;
    midTarget: string;
    longTarget: string;
  };
  finalVerdict: string;
};

export type AiPilotLiveQuote = {
  ticker: string;
  name: string;
  market: "KR" | "US";
  currency: "KRW" | "USD";
  price: number;
  change30dPct: number;
  peRatio: number | null;
  roe: number | null;
};

export type AiPilotLiveChart = {
  ticker: string;
  name: string;
  market: "KR" | "US";
  currency: "KRW" | "USD";
  closes: number[];
  high52w: number | null;
  low52w: number | null;
  targetMean: number | null;
  priceNow: number;
};

export type AiPilotResponse = {
  /** Pass 1: unconstrained Gemini answer (gemini.google.com quality baseline). */
  directAnswer: string;
  headline: string;
  prose: string;
  intent: "stock_picks" | "ranking" | "strategy" | "explain" | "general" | "single_stock";
  picks?: AiPilotPick[];
  rankingNote?: string;
  actionPlan?: { aggressive: string; conservative: string };
  deepAnalysis?: AiPilotDeepAnalysis;
  /** Live Yahoo Finance quotes grounded to the user's question (real-time). */
  liveQuotes?: AiPilotLiveQuote[];
  /** Single-stock 6-month price path for the colored chart. */
  liveChart?: AiPilotLiveChart;
  followUps: string[];
  disclaimer: string;
};

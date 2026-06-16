/** Shared inputs for guru analyzers (ported from korea-stock-analyzer-mcp). */

export type LynchInput = {
  price: number;
  per: number;
  eps: number;
  epsGrowthPct: number;
  divYield: number;
};

export type LynchResult = {
  fairValue: number;
  pegRatio: number;
  dividendAdjustedPEG: number;
  lynchScore: number;
  companyType: string;
  recommendation: string;
  upsidePct: number;
};

export type GreenblattInput = {
  price: number;
  eps: number;
  bps: number;
  marketCap: number;
  pbr: number;
};

export type GreenblattResult = {
  fairValue: number;
  roic: number;
  earningsYield: number;
  magicScore: number;
  comprehensiveScore: number;
  investmentGrade: string;
  recommendation: string;
  upsidePct: number;
};

export type SupplyTrend =
  | "strong_buy"
  | "accumulating"
  | "neutral"
  | "selling"
  | "strong_sell";

export type SupplyDemandSignal = {
  foreignNetAmount: number | null;
  institutionNetAmount: number | null;
  individualNetAmount: number | null;
  trend: SupplyTrend;
  label: string;
};

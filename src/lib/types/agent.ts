import type { PortfolioRating } from "@/lib/types/rating";

export type DebateVerdict = {
  bullCase: string;
  bearCase: string;
  verdict: string;
  rating: PortfolioRating;
};

export type RiskGateResult = {
  approved: boolean;
  reason: string;
  aggressiveView: string;
  conservativeView: string;
};

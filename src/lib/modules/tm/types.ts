export type TmJobMode = "backtest" | "train" | "regime_label" | "regime_test";
export type TmJobStatus = "queued" | "running" | "completed" | "failed" | "degraded";
export type TmJobSource = "trademaster" | "fallback";

export type TmRlMetrics = {
  sharpe: number;
  totalReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
  trades: number;
};

export type TmEquityPoint = {
  date: string;
  value: number;
};

export type TmRlJob = {
  id: string;
  userId: string;
  mode: TmJobMode;
  task: string;
  dataset: string;
  agent: string;
  tickers: string[];
  status: TmJobStatus;
  source: TmJobSource;
  metrics: TmRlMetrics;
  equityCurve: TmEquityPoint[];
  chartNote: string | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
};

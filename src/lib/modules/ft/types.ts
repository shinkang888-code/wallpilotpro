export type FtBotState = "running" | "stopped" | "reload_config" | string;

export type FtConnectionStatus = {
  online: boolean;
  configured: boolean;
  latencyMs: number | null;
  apiUrl: string;
  error: string | null;
};

export type FtBotStatus = {
  state: FtBotState;
  dryRun: boolean;
  strategy: string | null;
  exchange: string | null;
  timeframe: string | null;
  stakeCurrency: string | null;
  stakeAmount: number | null;
  maxOpenTrades: number | null;
  pairWhitelist: string[];
};

export type FtProfitSummary = {
  profitClosedCoin: number;
  profitClosedPercent: number;
  profitAllCoin: number;
  tradeCount: number;
  winRate: number | null;
};

export type FtOpenTradeCount = {
  current: number;
  max: number;
  totalStake: number;
};

export type FtOpenTrade = {
  tradeId: number;
  pair: string;
  isOpen: boolean;
  amount: number;
  openRate: number;
  currentRate: number | null;
  stakeAmount: number;
  profitPct: number | null;
  profitAbs: number | null;
  openDate: string;
};

export type FtControlAction = "start" | "stop" | "pause" | "reload";

export type FtControlResult = {
  ok: boolean;
  action: FtControlAction;
  status: string | null;
  message: string;
};

export type FtForceExitResult = {
  ok: boolean;
  message: string;
};

export type FtDashboardSnapshot = {
  connection: FtConnectionStatus;
  status: FtBotStatus | null;
  profit: FtProfitSummary | null;
  openTrades: FtOpenTradeCount | null;
  demoBacktest: FtBacktestHighlight;
};

export type FtBacktestHighlight = {
  periodDays: number;
  totalTrades: number;
  winRate: number;
  profitPct: number;
  maxDrawdownPct: number;
  pairs: string[];
  strategy: string;
};

export type FtCapability = {
  id: string;
  icon: "bot" | "chart" | "flask" | "brain" | "shield" | "globe";
  tier: "free" | "premium" | "elite";
};

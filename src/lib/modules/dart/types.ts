export type DartCompanyProfile = {
  corpCode: string;
  corpName: string;
  stockCode: string;
  ceoNm?: string;
  indutyCode?: string;
  estDt?: string;
  hmUrl?: string;
  corpCls?: string;
};

export type DartDisclosure = {
  rceptNo: string;
  corpName: string;
  stockCode: string;
  reportNm: string;
  rceptDt: string;
  flrNm?: string;
  dartUrl: string;
};

export type DartFinancialRow = {
  accountNm: string;
  currentAmount: number | null;
  priorAmount: number | null;
  sjDiv: string;
};

export type DartFinancialSnapshot = {
  bsnsYear: string;
  reprtCode: string;
  reprtName: string;
  fsDiv: string;
  rows: DartFinancialRow[];
};

export type DartKeyMetrics = {
  revenue: number | null;
  operatingIncome: number | null;
  netIncome: number | null;
  totalAssets: number | null;
  totalLiabilities: number | null;
  totalEquity: number | null;
  debtRatio: number | null;
  operatingMargin: number | null;
  roe: number | null;
  currentRatio: number | null;
};

export type DartMetricGrade = "good" | "caution" | "risk" | "na";

export type DartMetricHealthItem = {
  value: number | null;
  grade: DartMetricGrade;
};

export type DartMetricHealth = {
  debtRatio: DartMetricHealthItem;
  roe: DartMetricHealthItem;
  operatingMargin: DartMetricHealthItem;
  currentRatio: DartMetricHealthItem;
};

export type DartAiMode = "gemini" | "fallback";

export type DartLabAnalysis = {
  stockCode: string;
  corpName: string;
  profile: DartCompanyProfile;
  disclosures: DartDisclosure[];
  financials: DartFinancialSnapshot | null;
  metrics: DartKeyMetrics;
  metricHealth: DartMetricHealth;
  contextMarkdown: string;
  explanationMarkdown: string;
  aiMode: DartAiMode;
  aiSource: "vercel" | "local" | "none";
  source: "opendart" | "dartlab-ms";
  analyzedAt: string;
};

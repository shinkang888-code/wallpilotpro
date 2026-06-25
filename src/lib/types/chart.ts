export type ChartInterval = "1d" | "1wk" | "1mo";

export type ChartPoint = {
  date: string;
  close: number;
  volume: number;
};

export type StockChartSeries = {
  ticker: string;
  name: string;
  currency: "KRW" | "USD";
  interval: ChartInterval;
  points: ChartPoint[];
  lastPrice: number;
  priceSource?: "toss" | "yahoo";
};

export type StrategyAdvice = {
  priceFloor30d: number;
  priceCeiling30d: number;
  buyTiming: string;
  sellTiming: string;
  volumeInsight: string;
  summary: string;
  avgVolume20d: number;
  recentVolumeTrend: string;
};

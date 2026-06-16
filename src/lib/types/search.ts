import type { Market } from "@/lib/types/stock";

export type StockSearchResult = {
  ticker: string;
  name: string;
  market: Market;
  yahooSymbol: string;
  exchange: string;
};

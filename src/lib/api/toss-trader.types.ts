export type TossMoneyPair = {
  krw: string;
  usd: string;
};

export type TossHoldingItem = {
  symbol: string;
  name: string;
  marketCountry: "KR" | "US";
  currency: "KRW" | "USD";
  quantity: string;
  lastPrice: string;
  averagePurchasePrice: string;
  marketValue: {
    purchaseAmount: string;
    amount: string;
    amountAfterCost?: string;
  };
  profitLoss: {
    amount: string;
    rate: string;
    amountAfterCost?: string;
    rateAfterCost?: string;
  };
  dailyProfitLoss: {
    amount: string;
    rate: string;
  };
};

export type TossHoldingsOverview = {
  totalPurchaseAmount: TossMoneyPair;
  marketValue: {
    amount: TossMoneyPair;
    amountAfterCost: TossMoneyPair;
  };
  profitLoss: {
    amount: TossMoneyPair;
    amountAfterCost: TossMoneyPair;
    rate: string;
    rateAfterCost: string;
  };
  dailyProfitLoss: {
    amount: TossMoneyPair;
    rate: string;
  };
  items: TossHoldingItem[];
};

export type TossOpenOrder = {
  orderId: string;
  symbol: string;
  side: "BUY" | "SELL";
  orderType: string;
  status: string;
  price: string;
  quantity: string;
  currency: "KRW" | "USD";
  orderedAt: string;
  filledQuantity: string;
};

export type TossBuyingPowerDetail = {
  cashBuyingPower: string;
  currency: "KRW" | "USD";
  totalBuyingPower?: string;
};

export type TossTraderSnapshot = {
  connected: boolean;
  accountSeq: number | null;
  error: string | null;
  holdings: TossHoldingsOverview | null;
  buyingPower: TossBuyingPowerDetail | null;
  openOrders: TossOpenOrder[];
  wallet: { krw: number; usd: number } | null;
};

export type TossTraderFilter = "all" | "KR" | "US" | "crypto";

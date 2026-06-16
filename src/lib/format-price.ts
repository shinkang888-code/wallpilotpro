import type { Currency } from "@/lib/types/stock";

export type DualPrice = {
  primary: string;
  secondary: string;
  primaryCurrency: Currency;
  secondaryCurrency: Currency;
};

export function formatDualPrice(
  price: number,
  currency: Currency,
  usdKrw: number,
): DualPrice {
  if (currency === "USD") {
    const krw = price * usdKrw;
    return {
      primary: `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      secondary: `₩${Math.round(krw).toLocaleString("ko-KR")}`,
      primaryCurrency: "USD",
      secondaryCurrency: "KRW",
    };
  }
  const usd = price / usdKrw;
  return {
    primary: `₩${Math.round(price).toLocaleString("ko-KR")}`,
    secondary: `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    primaryCurrency: "KRW",
    secondaryCurrency: "USD",
  };
}

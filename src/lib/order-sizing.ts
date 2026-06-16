import type { StockRow } from "@/lib/types/stock";

/** 2% portfolio risk rule — qty from wallet and buying zone mid price. */
export function computeOrderQty(
  row: StockRow,
  wallet: { krw: number; usd: number } | null,
): number {
  if (!wallet) return row.currency === "USD" ? 1 : 1;

  const balance = row.currency === "USD" ? wallet.usd : wallet.krw;
  const mid = parseBuyingZoneMid(row.buyingZone, row.currency);
  if (mid <= 0 || balance <= 0) return 1;

  const budget = balance * 0.02;
  const qty = Math.floor(budget / mid);
  return Math.max(1, qty);
}

export function parseBuyingZoneMid(zone: string, currency: "KRW" | "USD"): number {
  const nums = zone.match(/[\d,.]+/g);
  if (!nums || nums.length === 0) return 0;
  const parsed = nums.map((n) =>
    currency === "USD" ? parseFloat(n.replace(/,/g, "")) : parseInt(n.replace(/,/g, ""), 10),
  );
  if (parsed.length === 1) return parsed[0]!;
  return (parsed[0]! + parsed[parsed.length - 1]!) / 2;
}

export function parseBuyingZoneBounds(
  zone: string,
  currency: "KRW" | "USD",
): { low: number; high: number } {
  const nums = zone.match(/[\d,.]+/g);
  if (!nums || nums.length < 2) {
    const mid = parseBuyingZoneMid(zone, currency);
    return { low: mid * 0.99, high: mid * 1.01 };
  }
  const parse = (n: string) =>
    currency === "USD" ? parseFloat(n.replace(/,/g, "")) : parseInt(n.replace(/,/g, ""), 10);
  return { low: parse(nums[0]!), high: parse(nums[nums.length - 1]!) };
}

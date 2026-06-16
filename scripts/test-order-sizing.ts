/**
 * Unit tests for order sizing — run: npx tsx scripts/test-order-sizing.ts
 */
import { computeOrderQty, parseBuyingZoneMid, parseBuyingZoneBounds } from "../src/lib/order-sizing.ts";
import type { StockRow } from "../src/lib/types/stock.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const row: StockRow = {
  ticker: "AAPL",
  name: "Apple",
  market: "US",
  price: 200,
  currency: "USD",
  momentum: 50,
  buyingZone: "$192.00 – $198.00",
  profitTarget: "$224.00",
  hardStop: "$184.00",
  volPrediction: "120% vs 20D avg",
  catalysts: [],
  guruBadges: [],
  rating: "Hold",
};

assert(parseBuyingZoneMid(row.buyingZone, "USD") === 195, "mid price");
const bounds = parseBuyingZoneBounds(row.buyingZone, "USD");
assert(bounds.low === 192 && bounds.high === 198, "zone bounds");

const qty = computeOrderQty(row, { krw: 0, usd: 10_000 });
assert(qty === Math.floor(10_000 * 0.02 / 195), "2% risk qty");
assert(qty >= 1, "min qty 1");

const krRow: StockRow = { ...row, currency: "KRW", buyingZone: "₩96,000 – ₩99,000" };
const krMid = parseBuyingZoneMid(krRow.buyingZone, "KRW");
assert(krMid === 97500, `kr mid got ${krMid}`);

console.log("PASS: order-sizing tests");

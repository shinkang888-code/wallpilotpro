import type { StockSearchResult } from "@/lib/types/search";

const STORAGE_KEY = "wallpilot-stock-pins";
const MAX_PINS = 14;

function pinKey(item: Pick<StockSearchResult, "market" | "ticker">): string {
  return `${item.market}:${item.ticker}`;
}

export function stockNavigateTarget(
  item: StockSearchResult,
): { to: "/dartlab" | "/wall-street-report"; search: { code: string } | { symbol: string } } {
  if (item.market === "KR") {
    return { to: "/dartlab", search: { code: item.ticker } };
  }
  return { to: "/wall-street-report", search: { symbol: item.ticker } };
}

export function stockTargetPath(item: StockSearchResult): string {
  if (item.market === "KR") {
    return `/dartlab?code=${item.ticker}`;
  }
  return `/wall-street-report?symbol=${encodeURIComponent(item.ticker)}`;
}

export function readStockPins(): StockSearchResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StockSearchResult[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p) =>
        p &&
        typeof p.ticker === "string" &&
        typeof p.name === "string" &&
        (p.market === "KR" || p.market === "US"),
    );
  } catch {
    return [];
  }
}

export function writeStockPins(pins: StockSearchResult[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins.slice(0, MAX_PINS)));
    window.dispatchEvent(new CustomEvent("wallpilot-stock-pins"));
  } catch {
    /* private mode */
  }
}

export function addStockPin(item: StockSearchResult): StockSearchResult[] {
  const key = pinKey(item);
  const next = [item, ...readStockPins().filter((p) => pinKey(p) !== key)].slice(0, MAX_PINS);
  writeStockPins(next);
  return next;
}

export function removeStockPin(item: Pick<StockSearchResult, "market" | "ticker">): StockSearchResult[] {
  const key = pinKey(item);
  const next = readStockPins().filter((p) => pinKey(p) !== key);
  writeStockPins(next);
  return next;
}

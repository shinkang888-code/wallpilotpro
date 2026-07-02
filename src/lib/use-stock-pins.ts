import { useCallback, useEffect, useState } from "react";

import {
  addStockPin,
  readStockPins,
  removeStockPin,
} from "@/lib/stock-pin-store";
import type { StockSearchResult } from "@/lib/types/search";

export function useStockPins() {
  const [pins, setPins] = useState<StockSearchResult[]>(() => readStockPins());

  const sync = useCallback(() => setPins(readStockPins()), []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "wallpilot-stock-pins") sync();
    };
    const onCustom = () => sync();
    window.addEventListener("storage", onStorage);
    window.addEventListener("wallpilot-stock-pins", onCustom);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("wallpilot-stock-pins", onCustom);
    };
  }, [sync]);

  const pin = useCallback((item: StockSearchResult) => {
    setPins(addStockPin(item));
  }, []);

  const unpin = useCallback((item: Pick<StockSearchResult, "market" | "ticker">) => {
    setPins(removeStockPin(item));
  }, []);

  return { pins, pin, unpin };
}

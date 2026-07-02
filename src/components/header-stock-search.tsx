import { Link, useNavigate } from "@tanstack/react-router";
import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { searchStockSymbols } from "@/lib/api/stock-search.functions";
import { useI18n } from "@/lib/i18n";
import { stockNavigateTarget } from "@/lib/stock-pin-store";
import type { StockSearchResult } from "@/lib/types/search";
import { useStockPins } from "@/lib/use-stock-pins";
import { cn } from "@/lib/utils";

export function HeaderStockSearch() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { pins, pin, unpin } = useStockPins();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const seqRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 1) {
      setResults([]);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const rows = await searchStockSymbols({ data: { query: trimmed, limit: 10 } });
      if (seq === seqRef.current) setResults(rows);
    } catch {
      if (seq === seqRef.current) setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(query), 260);
    return () => clearTimeout(timer);
  }, [query, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectStock = useCallback(
    (item: StockSearchResult) => {
      pin(item);
      setQuery("");
      setOpen(false);
      setResults([]);
      void navigate(stockNavigateTarget(item));
    },
    [navigate, pin],
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      {pins.length > 0 ? (
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-none"
          aria-label={t("header_stock_pins_aria")}
        >
          {pins.map((item) => {
            const target = stockNavigateTarget(item);
            return (
            <span
              key={`${item.market}-${item.ticker}`}
              className="inline-flex shrink-0 items-center overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.04]"
            >
              <Link
                to={target.to}
                search={target.search}
                className="inline-flex max-w-[9rem] items-center gap-1 px-2 py-1 text-[11px] font-semibold text-foreground hover:bg-primary/[0.06] sm:max-w-[11rem]"
                title={`${item.name} (${item.ticker})`}
              >
                <span className="truncate">{item.name}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{item.ticker}</span>
              </Link>
              <button
                type="button"
                onClick={() => unpin(item)}
                className="inline-flex h-full items-center border-l border-primary/15 px-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={t("header_stock_remove_pin").replace("{name}", item.name)}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
            );
          })}
        </div>
      ) : null}

      <div ref={wrapRef} className="relative w-full max-w-xl">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && results[0]) {
                e.preventDefault();
                selectStock(results[0]);
              }
              if (e.key === "Escape") {
                setOpen(false);
                inputRef.current?.blur();
              }
            }}
            placeholder={t("header_stock_search_placeholder")}
            aria-label={t("header_stock_search_aria")}
            aria-expanded={open && results.length > 0}
            aria-controls="header-stock-search-list"
            className={cn(
              "h-9 w-full rounded-lg border border-hairline bg-surface py-0 pl-8 pr-8 text-sm outline-none",
              "placeholder:text-muted-foreground/80 focus:border-primary/45 focus:ring-2 focus:ring-primary/15",
            )}
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? (
            <Loader2 className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
          ) : query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setResults([]);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
              aria-label={t("header_stock_clear")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>

        {open && query.trim().length > 0 ? (
          <ul
            id="header-stock-search-list"
            role="listbox"
            className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-hairline bg-background py-1 shadow-lg"
          >
            {loading && results.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-muted-foreground">{t("searching")}</li>
            ) : null}
            {!loading && results.length === 0 ? (
              <li className="px-3 py-2.5 text-xs text-muted-foreground">{t("header_stock_no_results")}</li>
            ) : null}
            {results.map((item) => (
              <li key={`${item.market}-${item.yahooSymbol}`} role="option">
                <button
                  type="button"
                  onClick={() => selectStock(item)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface"
                >
                  <span className="min-w-0 truncate font-medium">{item.name}</span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {item.ticker} · {item.market}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

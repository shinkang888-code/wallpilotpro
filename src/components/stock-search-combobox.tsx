import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { searchStockSymbols } from "@/lib/api/stock-search.functions";
import type { StockSearchResult } from "@/lib/types/search";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function StockSearchCombobox({
  value,
  onChange,
  onSelect,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (item: StockSearchResult) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 1) {
      setResults([]);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const rows = await searchStockSymbols({ data: { query, limit: 12 } });
      if (seq === seqRef.current) setResults(rows);
    } catch {
      if (seq === seqRef.current) setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => runSearch(value), 280);
    return () => clearTimeout(timer);
  }, [value, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) {
              onSelect(results[0]);
              setOpen(false);
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("ws_ticker_placeholder")}
          className="w-full rounded-xl border border-hairline bg-white py-3 pl-10 pr-10 font-display text-sm outline-none focus:border-primary/50 disabled:opacity-50"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{t("ws_search_hint")}</p>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-hairline bg-white py-1 shadow-lg">
          {results.map((r) => (
            <li key={`${r.market}-${r.yahooSymbol}`}>
              <button
                type="button"
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface",
                )}
              >
                <span className="min-w-0 truncate font-medium text-foreground">{r.name}</span>
                <span className="shrink-0 font-display text-xs tabular-nums text-muted-foreground">
                  {r.ticker} · {r.market}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

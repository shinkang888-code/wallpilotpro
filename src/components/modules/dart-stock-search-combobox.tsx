import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";

import { resolveKrStockCode, searchKrStockSymbols } from "@/lib/api/stock-search.functions";
import type { StockSearchResult } from "@/lib/types/search";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

function isKrStockCode(value: string): boolean {
  return /^\d{6}$/.test(value.trim());
}

export function DartStockSearchCombobox({
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
  const [resolving, setResolving] = useState(false);
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);

  const runSearch = useCallback(async (q: string) => {
    const query = q.trim();
    if (query.length < 1) {
      setResults([]);
      return;
    }
    if (isKrStockCode(query)) {
      setResults([]);
      setResolvedName(null);
      return;
    }
    const seq = ++seqRef.current;
    setLoading(true);
    try {
      const rows = await searchKrStockSymbols({ data: { query, limit: 12 } });
      if (seq === seqRef.current) {
        setResults(rows);
      }
    } catch {
      if (seq === seqRef.current) setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  const applyResolved = useCallback(
    (item: StockSearchResult) => {
      onChange(item.ticker);
      setResolvedName(item.name);
      onSelect(item);
    },
    [onChange, onSelect],
  );

  const resolveQuery = useCallback(
    async (raw: string): Promise<StockSearchResult | null> => {
      const query = raw.trim();
      if (!query || isKrStockCode(query)) {
        if (isKrStockCode(query)) setResolvedName(null);
        return null;
      }
      const seq = ++seqRef.current;
      setResolving(true);
      try {
        const item = await resolveKrStockCode({ data: { query } });
        if (seq !== seqRef.current) return null;
        onChange(item.ticker);
        setResolvedName(item.name);
        return item;
      } catch {
        return null;
      } finally {
        if (seq === seqRef.current) setResolving(false);
      }
    },
    [onChange],
  );

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(value), 280);
    return () => clearTimeout(timer);
  }, [value, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const busy = loading || resolving;

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative mt-2">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={value}
          disabled={disabled}
          onChange={(e) => {
            onChange(e.target.value);
            setResolvedName(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            void resolveQuery(value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (results[0]) {
                applyResolved(results[0]);
                setOpen(false);
                return;
              }
              void resolveQuery(value).then((item) => {
                if (item) onSelect(item);
              });
            }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={t("dart_search_placeholder")}
          className="w-full rounded-xl border border-hairline bg-white py-3 pl-10 pr-10 font-display text-sm outline-none focus:border-rose-400/60 disabled:opacity-50"
        />
        {busy && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {resolvedName && isKrStockCode(value)
          ? t("dart_resolved_hint").replace("{name}", resolvedName).replace("{code}", value)
          : t("dart_search_hint")}
      </p>

      {open && results.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-hairline bg-white py-1 shadow-lg">
          {results.map((r) => (
            <li key={`${r.market}-${r.yahooSymbol}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyResolved(r);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface",
                )}
              >
                <span className="min-w-0 truncate font-medium text-foreground">{r.name}</span>
                <span className="shrink-0 font-display text-xs tabular-nums text-muted-foreground">
                  {r.ticker}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export async function normalizeKrStockQuery(input: string): Promise<string> {
  const raw = input.trim();
  if (/^\d{6}$/.test(raw)) return raw;
  if (/^\d{1,6}$/.test(raw)) return raw.padStart(6, "0");
  try {
    const item = await resolveKrStockCode({ data: { query: raw } });
    return item.ticker;
  } catch (e) {
    if (e instanceof Error && e.message === "dart_kr_only") throw e;
    throw new Error("dart_invalid_code");
  }
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Hash, Loader2, Search } from "lucide-react";

import { resolveKrStockCode, searchKrStockSymbols } from "@/lib/api/stock-search.functions";
import { useI18n } from "@/lib/i18n";
import type { StockSearchResult } from "@/lib/types/search";
import { cn } from "@/lib/utils";

export function DartStockNameCodeSearch({
  companyName,
  stockCode,
  onCompanyNameChange,
  onStockCodeChange,
  onResolved,
  disabled,
}: {
  companyName: string;
  stockCode: string;
  onCompanyNameChange: (name: string) => void;
  onStockCodeChange: (code: string) => void;
  onResolved?: (item: StockSearchResult) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);
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
      const rows = await searchKrStockSymbols({ data: { query, limit: 12 } });
      if (seq === seqRef.current) setResults(rows);
    } catch {
      if (seq === seqRef.current) setResults([]);
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, []);

  const applyResolved = useCallback(
    (item: StockSearchResult) => {
      onCompanyNameChange(item.name);
      onStockCodeChange(item.ticker);
      setResolveError(null);
      onResolved?.(item);
    },
    [onCompanyNameChange, onStockCodeChange, onResolved],
  );

  const resolveName = useCallback(
    async (raw: string): Promise<StockSearchResult | null> => {
      const query = raw.trim();
      if (!query) {
        onStockCodeChange("");
        setResolveError(null);
        return null;
      }
      if (/^\d{6}$/.test(query)) {
        onStockCodeChange(query);
        setResolveError(null);
        return null;
      }

      const seq = ++seqRef.current;
      setResolving(true);
      setResolveError(null);
      try {
        const item = await resolveKrStockCode({ data: { query } });
        if (seq !== seqRef.current) return null;
        onStockCodeChange(item.ticker);
        if (item.name && item.name !== item.ticker) onCompanyNameChange(item.name);
        onResolved?.(item);
        return item;
      } catch {
        if (seq === seqRef.current) {
          onStockCodeChange("");
          setResolveError(t("dart_name_not_found"));
        }
        return null;
      } finally {
        if (seq === seqRef.current) setResolving(false);
      }
    },
    [onCompanyNameChange, onStockCodeChange, onResolved, t],
  );

  useEffect(() => {
    const timer = setTimeout(() => void runSearch(companyName), 280);
    return () => clearTimeout(timer);
  }, [companyName, runSearch]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const busy = loading || resolving;

  return (
    <div ref={wrapRef} className="space-y-1.5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_140px] sm:items-end">
        <label className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("dart_name_label")}
          </span>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={companyName}
              disabled={disabled}
              onChange={(e) => {
                onCompanyNameChange(e.target.value);
                onStockCodeChange("");
                setResolveError(null);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => {
                void resolveName(companyName);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (results[0]) {
                    applyResolved(results[0]);
                    setOpen(false);
                    return;
                  }
                  void resolveName(companyName);
                }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder={t("dart_name_placeholder")}
              className="w-full rounded-xl border border-hairline bg-white py-3 pl-10 pr-10 font-display text-sm outline-none focus:border-rose-400/60 disabled:opacity-50"
            />
            {busy && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </label>

        <label>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {t("dart_code_label")}
          </span>
          <div className="relative mt-2">
            <Hash className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <output
              aria-live="polite"
              className={cn(
                "flex w-full items-center rounded-xl border border-hairline bg-muted/20 py-3 pl-10 pr-3 font-display text-sm tabular-nums",
                stockCode ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {stockCode || t("dart_code_pending")}
            </output>
          </div>
        </label>
      </div>

      <p className="text-[11px] text-muted-foreground">{t("dart_search_hint")}</p>
      {resolveError ? <p className="text-[11px] text-destructive">{resolveError}</p> : null}

      {open && results.length > 0 && (
        <ul className="relative z-20 max-h-64 overflow-auto rounded-xl border border-hairline bg-white py-1 shadow-lg sm:absolute sm:mt-0 sm:w-[calc(100%-152px)]">
          {results.map((r) => (
            <li key={`${r.market}-${r.yahooSymbol}`}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  applyResolved(r);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-surface"
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

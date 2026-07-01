import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { OfficeEvent } from "@/lib/office/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

type Props = {
  events: OfficeEvent[];
  className?: string;
};

export function ActivityFeedPanel({ events, className }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        (e.actor ?? "시스템").toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q),
    );
  }, [events, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => setPage(1), [search]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  return (
    <aside
      className={cn(
        "flex flex-col rounded-2xl border border-[#e5e8eb] bg-white p-4 shadow-sm",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#191f28]">
          <span aria-hidden>🛰</span> 실시간 활동
        </h3>
        <span className="text-[10px] tabular-nums text-[#8b95a1]">{filtered.length}건</span>
      </div>

      <div className="relative mt-3">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-[#8b95a1]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="활동 검색 (담당·내용)…"
          className="w-full rounded-lg border border-[#e5e8eb] bg-[#f9fafb] py-2 pl-8 pr-3 text-xs text-[#191f28] outline-none ring-[#3182f6] focus:ring-2"
        />
      </div>

      <ul className="mt-3 min-h-[11rem] flex-1 space-y-2 overflow-y-auto text-xs">
        {pageItems.length === 0 ? (
          <li className="py-8 text-center text-[#8b95a1]">
            {search.trim() ? "검색 결과가 없습니다" : "이벤트가 없습니다"}
          </li>
        ) : (
          pageItems.map((ev) => (
            <li
              key={`${ev.id}-${ev.ts}`}
              className="rounded-lg border border-[#f2f4f6] bg-[#f9fafb] px-3 py-2"
            >
              <p className="font-semibold text-[#3182f6]">{ev.actor ?? "시스템"}</p>
              <p className="mt-0.5 leading-relaxed text-[#4e5968]">{ev.message}</p>
              <p className="mt-1 text-[10px] tabular-nums text-[#8b95a1]">
                {new Date(ev.ts).toLocaleString("ko-KR")}
              </p>
            </li>
          ))
        )}
      </ul>

      <div className="mt-3 flex items-center justify-between border-t border-[#f2f4f6] pt-3">
        <button
          type="button"
          disabled={safePage <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="rounded-lg p-1.5 text-[#8b95a1] hover:bg-[#f2f4f6] disabled:opacity-40"
          aria-label="이전 페이지"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-[10px] tabular-nums text-[#8b95a1]">
          {safePage} / {totalPages}
        </span>
        <button
          type="button"
          disabled={safePage >= totalPages}
          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          className="rounded-lg p-1.5 text-[#8b95a1] hover:bg-[#f2f4f6] disabled:opacity-40"
          aria-label="다음 페이지"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
    </aside>
  );
}

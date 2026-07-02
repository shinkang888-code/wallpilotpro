import { ChevronLeft, ChevronRight, CheckCircle2, Loader2, Search, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type { OfficeEvent } from "@/lib/office/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

type Props = {
  events: OfficeEvent[];
  className?: string;
};

function TaskProgressBar({ pct, status }: { pct: number; status?: OfficeEvent["task_status"] }) {
  const color =
    status === "completed"
      ? "bg-[#22c55e]"
      : status === "failed"
        ? "bg-[#ef4444]"
        : "bg-[#3182f6]";

  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center justify-between text-[10px]">
        <span className="font-semibold text-[#6b7684]">
          {status === "completed"
            ? "완료"
            : status === "failed"
              ? "실패"
              : status === "running"
                ? "진행 중"
                : "대기"}
        </span>
        <span className="tabular-nums font-bold text-[#191f28]">{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#e5e8eb]">
        <div
          className={cn("h-full rounded-full transition-all duration-500", color)}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
        />
      </div>
    </div>
  );
}

export function ActivityFeedPanel({ events, className }: Props) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter(
      (e) =>
        (e.actor ?? "시스템").toLowerCase().includes(q) ||
        e.message.toLowerCase().includes(q) ||
        (e.report_summary ?? "").toLowerCase().includes(q),
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
              key={`${ev.id}-${ev.ts}-${ev.task_id ?? ""}`}
              className={cn(
                "rounded-lg border px-3 py-2",
                ev.kind === "task" ? "border-[#3182f6]/20 bg-[#3182f6]/5" : "border-[#f2f4f6] bg-[#f9fafb]",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[#3182f6]">{ev.actor ?? "시스템"}</p>
                {ev.kind === "task" && ev.task_status === "running" && (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-[#3182f6]" />
                )}
                {ev.kind === "task" && ev.task_status === "completed" && (
                  <CheckCircle2 className="size-3.5 shrink-0 text-[#22c55e]" />
                )}
                {ev.kind === "task" && ev.task_status === "failed" && (
                  <XCircle className="size-3.5 shrink-0 text-[#ef4444]" />
                )}
              </div>
              <p className="mt-0.5 leading-relaxed text-[#4e5968]">{ev.message}</p>
              {ev.kind === "task" && typeof ev.progress_pct === "number" && (
                <TaskProgressBar pct={ev.progress_pct} status={ev.task_status} />
              )}
              {ev.kind === "task" && ev.task_status === "completed" && ev.report_summary && (
                <p className="mt-2 rounded-md bg-white/80 px-2 py-1.5 text-[10px] leading-relaxed text-[#3182f6]">
                  📋 완료 요약: {ev.report_summary}
                </p>
              )}
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

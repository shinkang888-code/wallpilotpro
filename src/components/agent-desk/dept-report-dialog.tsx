import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { postAgentDeskDeptReport } from "@/lib/api/office.functions";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import type { Department, Employee } from "@/lib/office/types";
import { STATUS_META } from "@/lib/office/types";
import { cn } from "@/lib/utils";

type Props = OfficeApiContext & {
  dept: Department;
  leader: Employee;
  items: string[];
  onClose: () => void;
};

export function DeptReportDialog({ dept, leader, items, accessToken, guestId, onClose }: Props) {
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const meta = STATUS_META[leader.status];

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await postAgentDeskDeptReport({
          data: {
            deptLabel: dept.label,
            deptSlug: dept.slug,
            leaderName: leader.name,
            items,
            accessToken,
            guestId,
          },
        });
        if (!cancelled) setBody(res.body);
      } catch {
        if (!cancelled) setError("보고서를 생성하지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dept, leader, items, accessToken, guestId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `4px solid ${dept.color}` }}
      >
        <header className="flex items-center gap-3 border-b border-[#f2f4f6] px-4 py-3">
          <span
            className="flex size-10 items-center justify-center rounded-full text-xl ring-2"
            style={{ borderColor: meta.ring }}
          >
            {leader.emoji ?? "🤖"}
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-[#191f28]">
              {dept.label} 정기 업무 보고
            </h2>
            <p className="flex items-center gap-1.5 text-xs text-[#8b95a1]">
              <span className={cn("size-1.5 rounded-full", meta.dot)} />
              {meta.label} · {leader.name}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-[#8b95a1] hover:bg-[#f2f4f6]">
            <X className="size-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="size-8 animate-spin text-[#3182f6]" />
              <p className="text-sm text-[#8b95a1]">담당 직원이 보고서를 준비 중입니다…</p>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}
          {!loading && !error && body && (
            <div className="prose prose-sm max-w-none text-[#191f28]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
        </div>

        <footer className="border-t border-[#f2f4f6] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-[#f2f4f6] py-2.5 text-sm font-semibold text-[#191f28]"
          >
            닫기
          </button>
        </footer>
      </div>
    </div>
  );
}
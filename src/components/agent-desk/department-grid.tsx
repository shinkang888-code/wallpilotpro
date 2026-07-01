import { Pencil } from "lucide-react";
import { useMemo } from "react";

import { buildDeptReport, leaderChitchat } from "@/lib/office/team-leader-utils";
import type { CompanyData, Department, Employee, OfficeEvent } from "@/lib/office/types";
import { STATUS_META } from "@/lib/office/types";
import { cn } from "@/lib/utils";

type Props = {
  company: CompanyData;
  events: OfficeEvent[];
  selectedDept: string | null;
  talking: Set<number>;
  onSelectDept: (slug: string | null) => void;
  onEditDept: (dept: Department) => void;
  onOpenReport: (dept: Department, leader: Employee, items: string[]) => void;
  onOpenChat: (leader: Employee, dept: Department) => void;
};

export function DepartmentGrid({
  company,
  events,
  selectedDept,
  talking,
  onSelectDept,
  onEditDept,
  onOpenReport,
  onOpenChat,
}: Props) {
  const byDept = useMemo(() => {
    const m = new Map<string, Employee[]>();
    for (const emp of company.employees) {
      const arr = m.get(emp.department_slug) ?? [];
      arr.push(emp);
      m.set(emp.department_slug, arr);
    }
    return m;
  }, [company.employees]);

  const downDepts = useMemo(() => {
    const s = new Set<string>();
    for (const site of company.sites) {
      if (site.status === "down" && site.department_slug) s.add(site.department_slug);
    }
    return s;
  }, [company.sites]);

  return (
    <div className="grid auto-rows-min gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {company.departments.map((dept) => {
        const emps = byDept.get(dept.slug) ?? [];
        const isDown = downDepts.has(dept.slug);
        const isActive = selectedDept === dept.slug;
        const report = buildDeptReport(dept.slug, company.employees, company.sites, events);
        const aiLeader = emps[0];

        return (
          <div
            key={dept.slug}
            className={cn(
              "self-start overflow-visible rounded-2xl border-2 bg-white p-4 shadow-sm transition",
              isDown && "ad-pulse-alert",
              isActive && "ring-2 ring-[#3182f6]/40",
            )}
            style={{ borderColor: isDown ? "#ef4444" : dept.color }}
          >
            <button
              type="button"
              onClick={() => onSelectDept(isActive ? null : dept.slug)}
              className="mb-3 flex w-full items-center justify-between text-left"
            >
              <h3 className="text-sm font-bold" style={{ color: dept.color }}>
                {dept.label}
                {report.hasReport && aiLeader && (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenReport(dept, aiLeader, report.items);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        onOpenReport(dept, aiLeader, report.items);
                      }
                    }}
                    className="ml-2 inline-flex cursor-pointer items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-amber-300"
                  >
                    📋 보고
                  </span>
                )}
              </h3>
              <span className="text-xs text-[#8b95a1]">{emps.length}명</span>
            </button>

            {emps.length === 0 ? (
              <p className="text-xs text-[#8b95a1]">배정된 팀원이 없습니다.</p>
            ) : aiLeader ? (
              <div className="space-y-2.5">
                <LeaderRow
                  dept={dept}
                  leader={aiLeader}
                  report={report}
                  isActive={isActive}
                  talking={talking}
                  onOpenReport={() => onOpenReport(dept, aiLeader, report.items)}
                  onOpenChat={() => onOpenChat(aiLeader, dept)}
                />
                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#e5e8eb] bg-[#f9fafb] px-2 py-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-lg ring-2 ring-[#3182f6]/30">
                    👤
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[#3182f6]">실무 담당</p>
                    <p className="truncate text-xs text-[#191f28]">
                      {dept.real_member_name || "미등록"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onEditDept(dept)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#3182f6]/10 px-2 py-1 text-[10px] font-semibold text-[#3182f6]"
                  >
                    <Pencil className="size-3" />
                    편집
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function LeaderRow({
  dept,
  leader,
  report,
  isActive,
  talking,
  onOpenReport,
  onOpenChat,
}: {
  dept: Department;
  leader: Employee;
  report: ReturnType<typeof buildDeptReport>;
  isActive: boolean;
  talking: Set<number>;
  onOpenReport: () => void;
  onOpenChat: () => void;
}) {
  const meta = STATUS_META[leader.status];
  const showReportBubble = report.hasReport;
  const showChitchat = !report.hasReport && (isActive || talking.has(leader.id));
  const bubbleText = showReportBubble
    ? "보고할 사항이 있습니다 📋"
    : showChitchat
      ? leaderChitchat(leader)
      : null;

  return (
    <div className="relative flex items-center gap-2 overflow-visible rounded-xl bg-[#f9fafb] px-2 py-2 pt-3">
      {bubbleText && (
        <button
          type="button"
          disabled={!showReportBubble}
          onClick={() => showReportBubble && onOpenReport()}
          className={cn(
            "ad-speech-bubble absolute -top-2 left-2 z-10 max-w-[85%] text-left text-[10px]",
            showReportBubble ? "cursor-pointer text-amber-900" : "text-[#4e5968]",
          )}
        >
          {bubbleText}
        </button>
      )}
      <button
        type="button"
        onClick={onOpenChat}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-xl ring-2"
        style={{ backgroundColor: `${dept.color}18`, borderColor: meta.ring }}
        title={`${leader.name} — 업무 지시`}
      >
        {leader.emoji ?? "🤖"}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold text-[#8b95a1]">🤖 AI 팀장</p>
        <p className="truncate text-xs font-medium text-[#191f28]">{leader.name}</p>
      </div>
      <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} title={meta.label} />
    </div>
  );
}

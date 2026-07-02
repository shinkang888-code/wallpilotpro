import { MessageCircle, Pencil, Settings2, Star } from "lucide-react";
import { useMemo } from "react";

import { buildDeptReport, getTeamLeader, leaderChitchat } from "@/lib/office/team-leader-utils";
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
  onManageDept: (dept: Department) => void;
  onOpenReport: (dept: Department, leader: Employee, items: string[]) => void;
  onOpenChat: (employee: Employee, dept: Department) => void;
};

export function DepartmentGrid({
  company,
  events,
  selectedDept,
  talking,
  onSelectDept,
  onEditDept,
  onManageDept,
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
    for (const [, arr] of m) {
      arr.sort((a, b) => {
        if (a.is_leader && !b.is_leader) return -1;
        if (!a.is_leader && b.is_leader) return 1;
        return a.id - b.id;
      });
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
        const aiLeader = getTeamLeader(dept.slug, emps);

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
            <div className="mb-3 flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onSelectDept(isActive ? null : dept.slug)}
                className="min-w-0 flex-1 text-left"
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
                <p className="mt-0.5 line-clamp-1 text-[10px] text-[#8b95a1]">
                  {dept.mission ?? "미션 미설정"} · {dept.constitution_role ?? "operator"}
                </p>
              </button>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-xs text-[#8b95a1]">{emps.length}명</span>
                <button
                  type="button"
                  title="부서 설정"
                  onClick={() => onManageDept(dept)}
                  className="rounded-lg p-1 text-[#8b95a1] hover:bg-[#f2f4f6]"
                >
                  <Settings2 className="size-3.5" />
                </button>
              </div>
            </div>

            {emps.length === 0 ? (
              <p className="text-xs text-[#8b95a1]">배정된 팀원이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {emps.map((emp) => (
                  <EmployeeRow
                    key={emp.slug}
                    dept={dept}
                    emp={emp}
                    isActive={isActive}
                    talking={talking}
                    showReportBubble={emp.is_leader === true && report.hasReport}
                    bubbleText={
                      emp.is_leader && report.hasReport
                        ? "보고할 사항이 있습니다 📋"
                        : emp.is_leader && (isActive || talking.has(emp.id))
                          ? leaderChitchat(emp)
                          : null
                    }
                    onOpenReport={() => aiLeader && onOpenReport(dept, aiLeader, report.items)}
                    onOpenChat={() => onOpenChat(emp, dept)}
                  />
                ))}

                <div className="flex items-center gap-2 rounded-xl border border-dashed border-[#e5e8eb] bg-[#f9fafb] px-2 py-2">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white text-base ring-2 ring-[#3182f6]/20">
                    👤
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold text-[#3182f6]">실무 담당 (Human)</p>
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
            )}
          </div>
        );
      })}
    </div>
  );
}

function EmployeeRow({
  dept,
  emp,
  isActive,
  talking,
  showReportBubble,
  bubbleText,
  onOpenReport,
  onOpenChat,
}: {
  dept: Department;
  emp: Employee;
  isActive: boolean;
  talking: Set<number>;
  showReportBubble: boolean;
  bubbleText: string | null;
  onOpenReport: () => void;
  onOpenChat: () => void;
}) {
  const meta = STATUS_META[emp.status];

  return (
    <div className="relative flex items-center gap-2 overflow-visible rounded-xl bg-[#f9fafb] px-2 py-2 pt-3">
      {bubbleText && emp.is_leader && (
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
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg ring-2"
        style={{ backgroundColor: `${dept.color}18`, borderColor: meta.ring }}
        title={`${emp.name} — 업무 지시 (독립 워크스페이스)`}
      >
        {emp.emoji ?? "🤖"}
      </button>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 text-[10px] font-semibold text-[#8b95a1]">
          {emp.is_leader ? (
            <>
              <Star className="size-2.5 fill-[#f59e0b] text-[#f59e0b]" /> AI 팀장
            </>
          ) : (
            "AI 직원"
          )}
        </p>
        <p className="truncate text-xs font-medium text-[#191f28]">{emp.name}</p>
        {emp.vibe && (
          <p className="truncate text-[10px] text-[#8b95a1]">인격: {emp.vibe}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenChat}
        className="shrink-0 rounded-lg bg-[#3182f6]/10 p-1.5 text-[#3182f6]"
        title="카톡 업무 지시"
      >
        <MessageCircle className="size-3.5" />
      </button>
      <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} title={meta.label} />
    </div>
  );
}

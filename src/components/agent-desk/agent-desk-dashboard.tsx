import { Building2, LayoutGrid, Loader2, Radar, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { ActivityFeedPanel } from "@/components/agent-desk/activity-feed-panel";
import { BuildingScene } from "@/components/agent-desk/building-scene";
import { CharacterDock } from "@/components/agent-desk/character-dock";
import { DepartmentGrid } from "@/components/agent-desk/department-grid";
import { DeptProfileDialog } from "@/components/agent-desk/dept-profile-dialog";
import { DeptReportDialog } from "@/components/agent-desk/dept-report-dialog";
import { WorkChatSheet } from "@/components/agent-desk/work-chat-sheet";
import { useAgentDesk } from "@/lib/agent-desk/use-agent-desk";
import { useI18n } from "@/lib/i18n";
import type { Department, Employee } from "@/lib/office/types";
import { useAuth } from "@/lib/use-auth";

import "@/styles/agent-desk.css";

export function AgentDeskDashboard() {
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const { company, events, routeBindings, loading, checking, runSiteCheck, refresh } =
    useAgentDesk(accessToken);

  const [view, setView] = useState<"grid" | "building">("grid");

  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [talking, setTalking] = useState<Set<number>>(new Set());
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [chatTarget, setChatTarget] = useState<{
    leader: Employee;
    dept: Department;
  } | null>(null);
  const [reportTarget, setReportTarget] = useState<{
    dept: Department;
    leader: Employee;
    items: string[];
  } | null>(null);

  useEffect(() => {
    if (!company) return;
    const ids = company.employees.map((e) => e.id);
    const rotate = () => {
      const next = new Set<number>();
      const count = Math.min(8, ids.length);
      for (let i = 0; i < count; i++) {
        next.add(ids[Math.floor(Math.random() * ids.length)]);
      }
      setTalking(next);
    };
    rotate();
    const timer = window.setInterval(rotate, 3200);
    return () => window.clearInterval(timer);
  }, [company]);

  if (loading && !company) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#3182f6]" />
      </div>
    );
  }

  if (!company) {
    return (
      <p className="py-12 text-center text-sm text-[#8b95a1]">
        {t("agent_desk_failed")}
      </p>
    );
  }

  const stats = company.stats;

  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      {/* Hero */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#191f28] via-[#1e3a5f] to-[#3182f6] p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
          WallPilot Pro · AI Office
        </p>
        <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">
          {t("module_agent_desk_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100/90">{t("module_agent_desk_body")}</p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill icon={<Users className="size-4" />} label="AI 직원" value={stats.total} />
          <StatPill icon={<LayoutGrid className="size-4" />} label="부서" value={stats.departments} />
          <StatPill label="근무중" value={stats.working} accent="#22c55e" />
          <StatPill label="회의중" value={stats.meeting} accent="#f59e0b" />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void runSiteCheck()}
            disabled={checking}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-xs font-semibold backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Radar className="size-3.5" />
            )}
            LogShield 관제 점검
          </button>
          <div className="inline-flex rounded-xl bg-black/25 p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === "grid" ? "bg-white text-[#191f28]" : "text-white/80"
              }`}
            >
              <LayoutGrid className="size-3.5" />
              부서 뷰
            </button>
            <button
              type="button"
              onClick={() => setView("building")}
              className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold ${
                view === "building" ? "bg-white text-[#191f28]" : "text-white/80"
              }`}
            >
              <Building2 className="size-3.5" />
              빌딩 뷰
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <CharacterDock
          departments={company.departments}
          accessToken={accessToken}
          onBindingsChanged={() => void refresh()}
        />
      </div>

      {view === "building" && (
        <div className="mb-6">
          <BuildingScene
            company={company}
            routeBindings={routeBindings}
            onSelectEmployee={(leader) => {
              const dept = company.departments.find((d) => d.slug === leader.department_slug);
              if (dept) setChatTarget({ leader, dept });
            }}
          />
          <p className="mt-2 text-center text-xs text-[#8b95a1]">
            캐릭터를 클릭하면 업무 지시 채팅이 열립니다 · AniStudio 캐릭터는 경로 애니메이션 적용
          </p>
        </div>
      )}

      {/* Grid + Activity */}
      <div className={`grid gap-6 lg:grid-cols-[1fr_300px] ${view === "grid" ? "" : "hidden"}`}>
        <DepartmentGrid
          company={company}
          events={events}
          selectedDept={selectedDept}
          talking={talking}
          onSelectDept={setSelectedDept}
          onEditDept={setEditingDept}
          onOpenReport={(dept, leader, items) => setReportTarget({ dept, leader, items })}
          onOpenChat={(leader, dept) => setChatTarget({ leader, dept })}
        />
        <ActivityFeedPanel events={events} className="lg:sticky lg:top-24" />
      </div>

      {editingDept && (
        <DeptProfileDialog
          dept={editingDept}
          accessToken={accessToken}
          onClose={() => setEditingDept(null)}
          onSaved={() => void refresh()}
        />
      )}

      {chatTarget && (
        <WorkChatSheet
          leader={chatTarget.leader}
          dept={chatTarget.dept}
          accessToken={accessToken}
          onClose={() => setChatTarget(null)}
        />
      )}

      {reportTarget && (
        <DeptReportDialog
          dept={reportTarget.dept}
          leader={reportTarget.leader}
          items={reportTarget.items}
          accessToken={accessToken}
          onClose={() => setReportTarget(null)}
        />
      )}
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-[10px] font-medium text-blue-200">
        {icon}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: accent ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { ActivityFeedPanel } from "@/components/agent-desk/activity-feed-panel";
import { BuildingScene } from "@/components/agent-desk/building-scene";
import { CeoCommandBar } from "@/components/agent-desk/ceo-command-bar";
import { CharacterDock } from "@/components/agent-desk/character-dock";
import { DepartmentGrid } from "@/components/agent-desk/department-grid";
import { DeptManageDialog } from "@/components/agent-desk/dept-manage-dialog";
import { DeptProfileDialog } from "@/components/agent-desk/dept-profile-dialog";
import { DeptReportDialog } from "@/components/agent-desk/dept-report-dialog";
import { EmployeeAssignDialog } from "@/components/agent-desk/employee-assign-dialog";
import { PersonaEditorDialog } from "@/components/agent-desk/persona-editor-dialog";
import {
  CeoBulkCommandPanel,
  ReportArchiveDrawer,
} from "@/components/agent-desk/report-archive-drawer";
import { WorkChatSheet } from "@/components/agent-desk/work-chat-sheet";
import { useAgentDesk } from "@/lib/agent-desk/use-agent-desk";
import { useOfficeFsm } from "@/lib/agent-desk/use-office-fsm";
import { useI18n } from "@/lib/i18n";
import type { Department, Employee } from "@/lib/office/types";
import { useAuth } from "@/lib/use-auth";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";

import "@/styles/agent-desk.css";

type Panel =
  | "dept_manage"
  | "employee_assign"
  | "persona"
  | "ceo_bulk"
  | "archive"
  | null;

export function AgentDeskDashboard() {
  const { t } = useI18n();
  const { accessToken } = useAuth();
  const { key: geminiApiKey } = useGeminiApiKey();
  const { company, events, routeBindings, loading, checking, runSiteCheck, refresh } =
    useAgentDesk(accessToken);
  const { snapshot: fsmSnapshot, streaming: fsmStreaming } = useOfficeFsm(accessToken);

  const [view, setView] = useState<"grid" | "building">("grid");
  const [panel, setPanel] = useState<Panel>(null);

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
      <p className="py-12 text-center text-sm text-[#8b95a1]">{t("agent_desk_failed")}</p>
    );
  }

  const stats = company.stats;

  return (
    <div className="px-4 pb-8 pt-4 sm:px-6">
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-[#191f28] via-[#1e3a5f] to-[#3182f6] p-5 text-white sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-blue-200">
          WallPilot Pro · AI Office (Leaf)
        </p>
        <h2 className="mt-1 font-display text-xl font-bold sm:text-2xl">
          {t("module_agent_desk_title")}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
          AI 직원별 독립 워크스페이스 · 헌법 규칙 기반 답변 · 보고서 아티팩트 보관
          {fsmStreaming && (
            <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[10px]">FSM Live</span>
          )}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="AI 직원" value={stats.total} />
          <StatPill label="부서" value={stats.departments} />
          <StatPill label="근무중" value={stats.working} accent="#22c55e" />
          <StatPill label="회의중" value={stats.meeting} accent="#f59e0b" />
        </div>
      </div>

      <CeoCommandBar
        checking={checking}
        view={view}
        onViewChange={setView}
        onSiteCheck={() => void runSiteCheck()}
        onOpenDeptManage={() => setPanel("dept_manage")}
        onOpenEmployeeAssign={() => setPanel("employee_assign")}
        onOpenPersonaEditor={() => setPanel("persona")}
        onOpenCeoBulk={() => setPanel("ceo_bulk")}
        onOpenReportArchive={() => setPanel("archive")}
      />

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
            fsmSnapshot={fsmSnapshot}
            onSelectEmployee={(leader) => {
              const dept = company.departments.find((d) => d.slug === leader.department_slug);
              if (dept) setChatTarget({ leader, dept });
            }}
          />
          <p className="mt-2 text-center text-xs text-[#8b95a1]">
            캐릭터 클릭 → 독립 워크스페이스(카톡) · AniStudio 경로 애니메이션
          </p>
        </div>
      )}

      <div className={`grid gap-6 lg:grid-cols-[1fr_300px] ${view === "grid" ? "" : "hidden"}`}>
        <DepartmentGrid
          company={company}
          events={events}
          selectedDept={selectedDept}
          talking={talking}
          onSelectDept={setSelectedDept}
          onEditDept={setEditingDept}
          onManageDept={() => setPanel("dept_manage")}
          onOpenReport={(dept, leader, items) => setReportTarget({ dept, leader, items })}
          onOpenChat={(employee, dept) => setChatTarget({ leader: employee, dept })}
        />
        <ActivityFeedPanel events={events} className="lg:sticky lg:top-24" />
      </div>

      {panel === "dept_manage" && (
        <DeptManageDialog
          departments={company.departments}
          accessToken={accessToken}
          onClose={() => setPanel(null)}
          onSaved={() => void refresh()}
        />
      )}
      {panel === "employee_assign" && (
        <EmployeeAssignDialog
          company={company}
          accessToken={accessToken}
          onClose={() => setPanel(null)}
          onSaved={() => void refresh()}
        />
      )}
      {panel === "persona" && (
        <PersonaEditorDialog
          company={company}
          accessToken={accessToken}
          onClose={() => setPanel(null)}
          onSaved={() => void refresh()}
        />
      )}
      {panel === "ceo_bulk" && (
        <CeoBulkCommandPanel
          company={company}
          accessToken={accessToken}
          onClose={() => setPanel(null)}
          onDone={() => void refresh()}
        />
      )}
      {panel === "archive" && (
        <ReportArchiveDrawer accessToken={accessToken} onClose={() => setPanel(null)} />
      )}

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
          geminiApiKey={geminiApiKey}
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
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-medium text-blue-200">{label}</p>
      <p className="mt-0.5 text-lg font-bold tabular-nums" style={{ color: accent ?? "#fff" }}>
        {value}
      </p>
    </div>
  );
}

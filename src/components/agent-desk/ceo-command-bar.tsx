import {
  Archive,
  Building2,
  Loader2,
  Megaphone,
  Radar,
  Settings2,
  UserCog,
  Users,
} from "lucide-react";

type Props = {
  checking: boolean;
  view: "grid" | "building";
  onViewChange: (v: "grid" | "building") => void;
  onSiteCheck: () => void;
  onOpenDeptManage: () => void;
  onOpenEmployeeAssign: () => void;
  onOpenPersonaEditor: () => void;
  onOpenCeoBulk: () => void;
  onOpenReportArchive: () => void;
};

export function CeoCommandBar({
  checking,
  view,
  onViewChange,
  onSiteCheck,
  onOpenDeptManage,
  onOpenEmployeeAssign,
  onOpenPersonaEditor,
  onOpenCeoBulk,
  onOpenReportArchive,
}: Props) {
  const tools = [
    {
      id: "dept",
      label: "조직 설정",
      hint: "부서 신설·수정·삭제",
      icon: <Building2 className="size-3.5" />,
      onClick: onOpenDeptManage,
    },
    {
      id: "assign",
      label: "직원 배치",
      hint: "부서별 AI 직원·팀장 지정",
      icon: <Users className="size-3.5" />,
      onClick: onOpenEmployeeAssign,
    },
    {
      id: "persona",
      label: "역할·인격",
      hint: "헌법 역할·인격어·프롬프트",
      icon: <UserCog className="size-3.5" />,
      onClick: onOpenPersonaEditor,
    },
    {
      id: "ceo",
      label: "일괄 지시",
      hint: "전체/선택 부서 동시 업무 지시",
      icon: <Megaphone className="size-3.5" />,
      onClick: onOpenCeoBulk,
      accent: "#f59e0b",
    },
    {
      id: "archive",
      label: "보고서 보관함",
      hint: "저장된 AI 보고·문서 다운로드",
      icon: <Archive className="size-3.5" />,
      onClick: onOpenReportArchive,
    },
    {
      id: "settings",
      label: "조직 총괄",
      hint: "AI 오피스 설정 허브",
      icon: <Settings2 className="size-3.5" />,
      onClick: onOpenDeptManage,
    },
  ];

  return (
    <div className="mb-4 rounded-2xl border border-[#e5e8eb] bg-white p-3 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#8b95a1]">
            CEO 커맨드 센터
          </p>
          <p className="text-xs text-[#6b7684]">
            각 AI 직원 독립 워크스페이스 · 헌법 규칙 · 아티팩트 보관
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSiteCheck}
            disabled={checking}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#e5e8eb] px-3 py-1.5 text-xs font-semibold text-[#191f28] hover:bg-[#f9fafb] disabled:opacity-60"
          >
            {checking ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Radar className="size-3.5 text-[#ef4444]" />
            )}
            LogShield
          </button>
          <div className="inline-flex rounded-xl bg-[#f2f4f6] p-0.5">
            <button
              type="button"
              onClick={() => onViewChange("grid")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                view === "grid" ? "bg-white text-[#191f28] shadow-sm" : "text-[#8b95a1]"
              }`}
            >
              부서 뷰
            </button>
            <button
              type="button"
              onClick={() => onViewChange("building")}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                view === "building" ? "bg-white text-[#191f28] shadow-sm" : "text-[#8b95a1]"
              }`}
            >
              빌딩 뷰
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={t.onClick}
            title={t.hint}
            className="group flex flex-col items-start rounded-xl border border-[#f2f4f6] bg-[#f9fafb] px-3 py-2.5 text-left transition hover:border-[#3182f6]/30 hover:bg-white hover:shadow-sm"
          >
            <span
              className="mb-1 flex size-7 items-center justify-center rounded-lg bg-white shadow-sm"
              style={{ color: t.accent ?? "#3182f6" }}
            >
              {t.icon}
            </span>
            <span className="text-xs font-bold text-[#191f28]">{t.label}</span>
            <span className="mt-0.5 line-clamp-2 text-[10px] leading-tight text-[#8b95a1]">
              {t.hint}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { DialogShell } from "@/components/agent-desk/dept-manage-dialog";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import { postAgentDeskUpsertEmployee } from "@/lib/api/office.functions";
import type { CompanyData } from "@/lib/office/types";

type Props = OfficeApiContext & {
  company: CompanyData;
  onClose: () => void;
  onSaved: () => void;
};

export function PersonaEditorDialog({ company, accessToken, guestId, onClose, onSaved }: Props) {
  const [slug, setSlug] = useState(company.employees[0]?.slug ?? "");
  const [vibe, setVibe] = useState(company.employees[0]?.vibe ?? "");
  const [constitutionPrompt, setConstitutionPrompt] = useState(
    company.employees[0]?.constitution_prompt ?? "",
  );
  const [constitutionRole, setConstitutionRole] = useState(
    company.employees[0]?.constitution_role ?? "operator",
  );
  const [workspaceX, setWorkspaceX] = useState(
    String(company.employees[0]?.workspace_x_pct ?? ""),
  );
  const [workspaceY, setWorkspaceY] = useState(
    String(company.employees[0]?.workspace_y_pct ?? ""),
  );
  const [loading, setLoading] = useState(false);

  const emp = company.employees.find((e) => e.slug === slug);

  function loadEmp(nextSlug: string) {
    setSlug(nextSlug);
    const e = company.employees.find((x) => x.slug === nextSlug);
    setVibe(e?.vibe ?? "");
    setConstitutionPrompt(e?.constitution_prompt ?? "");
    setConstitutionRole(e?.constitution_role ?? "operator");
    setWorkspaceX(e?.workspace_x_pct != null ? String(e.workspace_x_pct) : "");
    setWorkspaceY(e?.workspace_y_pct != null ? String(e.workspace_y_pct) : "");
  }

  async function save() {
    if (!emp) return;
    setLoading(true);
    try {
      const x = workspaceX.trim() ? Number(workspaceX) : null;
      const y = workspaceY.trim() ? Number(workspaceY) : null;
      await postAgentDeskUpsertEmployee({
        data: {
          slug: emp.slug,
          department_slug: emp.department_slug,
          name: emp.name,
          description: emp.description,
          emoji: emp.emoji,
          vibe: vibe.trim() || null,
          constitution_role: constitutionRole,
          constitution_prompt: constitutionPrompt.trim() || null,
          is_leader: emp.is_leader,
          seed_employee_id: emp.is_custom ? null : emp.id,
          workspace_x_pct: Number.isFinite(x) ? x : null,
          workspace_y_pct: Number.isFinite(y) ? y : null,
          accessToken,
          guestId,
        },
      });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogShell
      title="역할·인격 설계"
      subtitle="Leaf 헌법 규칙 — 인격어·말투·워크스페이스 좌표"
      onClose={onClose}
      wide
    >
      <select
        value={slug}
        onChange={(e) => loadEmp(e.target.value)}
        className="mb-3 w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
      >
        {company.employees.map((e) => (
          <option key={e.slug} value={e.slug}>
            {e.name} ({company.departments.find((d) => d.slug === e.department_slug)?.label})
          </option>
        ))}
      </select>

      {emp && (
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">인격어 (말투·태도)</label>
            <input
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              placeholder="예: 데이터 기반 낙관적"
              className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">헌법 역할</label>
            <select
              value={constitutionRole}
              onChange={(e) => setConstitutionRole(e.target.value)}
              className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
            >
              <option value="director">디렉터</option>
              <option value="researcher">리서처</option>
              <option value="marketer">마케터</option>
              <option value="reviewer">리뷰어</option>
              <option value="operator">실무</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">헌법 프롬프트</label>
            <textarea
              value={constitutionPrompt}
              onChange={(e) => setConstitutionPrompt(e.target.value)}
              rows={4}
              placeholder="환각 금지, 출처 명시, CEO 보고 형식…"
              className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">
                워크스페이스 X (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={workspaceX}
                onChange={(e) => setWorkspaceX(e.target.value)}
                placeholder="0–100"
                className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">
                워크스페이스 Y (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={workspaceY}
                onChange={(e) => setWorkspaceY(e.target.value)}
                placeholder="0–100"
                className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <p className="text-[10px] text-[#8b95a1]">
            빌딩뷰 캐릭터 배치 좌표 (비워두면 부서 기본 위치)
          </p>
          <button
            type="button"
            disabled={loading}
            onClick={() => void save()}
            className="w-full rounded-xl bg-[#3182f6] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "인격·역할 저장"}
          </button>
        </div>
      )}
    </DialogShell>
  );
}

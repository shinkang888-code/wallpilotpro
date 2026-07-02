import { Loader2, Plus, Star, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { DialogShell } from "@/components/agent-desk/dept-manage-dialog";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import { postAgentDeskUpsertEmployee } from "@/lib/api/office.functions";
import type { CompanyData, Employee } from "@/lib/office/types";

type Props = OfficeApiContext & {
  company: CompanyData;
  onClose: () => void;
  onSaved: () => void;
};

export function EmployeeAssignDialog({ company, accessToken, guestId, onClose, onSaved }: Props) {
  const [deptSlug, setDeptSlug] = useState(company.departments[0]?.slug ?? "");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newEmoji, setNewEmoji] = useState("🤖");

  const deptEmployees = useMemo(
    () => company.employees.filter((e) => e.department_slug === deptSlug),
    [company.employees, deptSlug],
  );

  const selected = company.employees.find((e) => e.slug === selectedSlug);

  async function setLeader(emp: Employee) {
    setLoading(true);
    try {
      await postAgentDeskUpsertEmployee({
        data: {
          slug: emp.slug,
          department_slug: emp.department_slug,
          name: emp.name,
          description: emp.description,
          emoji: emp.emoji,
          vibe: emp.vibe,
          constitution_role: emp.constitution_role ?? undefined,
          constitution_prompt: emp.constitution_prompt,
          is_leader: true,
          seed_employee_id: emp.is_custom ? null : emp.id,
          accessToken,
          guestId,
        },
      });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  async function createEmployee() {
    if (!newName.trim()) return;
    setLoading(true);
    try {
      await postAgentDeskUpsertEmployee({
        data: {
          department_slug: deptSlug,
          name: newName.trim(),
          description: newDescription.trim() || null,
          emoji: newEmoji.trim() || "🤖",
          is_leader: deptEmployees.length === 0,
          accessToken,
          guestId,
        },
      });
      setNewName("");
      setNewDescription("");
      setNewEmoji("🤖");
      setShowCreate(false);
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogShell
      title="직원 배치"
      subtitle="부서별 AI 직원 확인 · 신규 등록 · 팀장 지정"
      onClose={onClose}
      wide
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-[#8b95a1]">부서 선택</label>
          <select
            value={deptSlug}
            onChange={(e) => {
              setDeptSlug(e.target.value);
              setSelectedSlug(null);
            }}
            className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
          >
            {company.departments.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowCreate((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#f2f4f6] px-2.5 py-1 text-xs font-semibold text-[#3182f6]"
          >
            <UserPlus className="size-3.5" />
            AI 직원 신규 등록
          </button>

          {showCreate && (
            <div className="mt-2 space-y-2 rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 p-3">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="직원 이름"
                className="w-full rounded-lg border border-[#e5e8eb] px-2.5 py-1.5 text-sm"
              />
              <input
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="역할 설명 (예: 데이터 분석 담당)"
                className="w-full rounded-lg border border-[#e5e8eb] px-2.5 py-1.5 text-sm"
              />
              <input
                value={newEmoji}
                onChange={(e) => setNewEmoji(e.target.value)}
                placeholder="이모지"
                className="w-20 rounded-lg border border-[#e5e8eb] px-2.5 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={loading || !newName.trim()}
                onClick={() => void createEmployee()}
                className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#3182f6] py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                등록
              </button>
            </div>
          )}

          <div className="mt-3 space-y-1.5">
            {deptEmployees.length === 0 ? (
              <p className="text-xs text-[#8b95a1]">배치된 AI 직원이 없습니다. 신규 등록하세요.</p>
            ) : (
              deptEmployees.map((emp) => (
                <button
                  key={emp.slug}
                  type="button"
                  onClick={() => setSelectedSlug(emp.slug)}
                  className={`flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left ${
                    selectedSlug === emp.slug
                      ? "border-[#3182f6] bg-[#3182f6]/5"
                      : "border-[#f2f4f6]"
                  }`}
                >
                  <span className="text-lg">{emp.emoji ?? "🤖"}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{emp.name}</p>
                    <p className="truncate text-[10px] text-[#8b95a1]">{emp.description}</p>
                  </div>
                  {emp.is_leader && (
                    <Star className="size-3.5 shrink-0 fill-[#f59e0b] text-[#f59e0b]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-[#e5e8eb] bg-[#f9fafb] p-3">
          {selected ? (
            <>
              <p className="text-sm font-bold">{selected.name}</p>
              <p className="mt-1 text-xs text-[#6b7684]">{selected.description}</p>
              <p className="mt-2 text-[10px] text-[#8b95a1]">
                인격어: {selected.vibe ?? "미설정"}
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={() => void setLeader(selected)}
                className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded-xl bg-[#3182f6] py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Star className="size-3.5" />}
                AI 팀장으로 지정
              </button>
            </>
          ) : (
            <p className="py-8 text-center text-xs text-[#8b95a1]">
              직원을 선택하면 팀장 지정·워크스페이스 정보를 확인할 수 있습니다.
            </p>
          )}
        </div>
      </div>
    </DialogShell>
  );
}

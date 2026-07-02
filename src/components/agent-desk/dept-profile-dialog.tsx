import { useState } from "react";

import { patchAgentDeskDeptProfile } from "@/lib/api/office.functions";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import type { Department } from "@/lib/office/types";

type Props = OfficeApiContext & {
  dept: Department;
  onClose: () => void;
  onSaved: (dept: Department) => void;
};

export function DeptProfileDialog({ dept, accessToken, guestId, onClose, onSaved }: Props) {
  const [name, setName] = useState(dept.real_member_name ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await patchAgentDeskDeptProfile({
        data: { deptSlug: dept.slug, realMemberName: name, accessToken, guestId },
      });
      if (res.dept) onSaved(res.dept);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-base font-bold text-[#191f28]">실무 담당자 편집</h2>
        <p className="mt-1 text-xs text-[#8b95a1]">{dept.label}</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="실무 담당자 이름"
          className="mt-4 w-full rounded-xl border border-[#e5e8eb] px-3 py-2.5 text-sm outline-none ring-[#3182f6] focus:ring-2"
        />
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl bg-[#f2f4f6] py-2.5 text-sm font-semibold"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#3182f6] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

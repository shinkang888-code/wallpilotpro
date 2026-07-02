import { Loader2, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

import {
  postAgentDeskDeleteDepartment,
  postAgentDeskUpsertDepartment,
} from "@/lib/api/office.functions";
import {
  CONSTITUTION_ROLE_META,
  inferConstitutionRole,
  type ConstitutionRole,
} from "@/lib/office/constitution";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import type { Department } from "@/lib/office/types";

type Props = OfficeApiContext & {
  departments: Department[];
  onClose: () => void;
  onSaved: () => void;
};

const ROLES = Object.keys(CONSTITUTION_ROLE_META) as ConstitutionRole[];

export function DeptManageDialog({ departments, accessToken, guestId, onClose, onSaved }: Props) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState("#3182f6");
  const [mission, setMission] = useState("");
  const [constitutionRole, setConstitutionRole] = useState<ConstitutionRole>("operator");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function startEdit(dept: Department) {
    setEditingSlug(dept.slug);
    setLabel(dept.label);
    setColor(dept.color);
    setMission(dept.mission ?? "");
    setConstitutionRole((dept.constitution_role as ConstitutionRole) ?? inferConstitutionRole(dept.slug));
  }

  async function save() {
    if (!label.trim()) return;
    setLoading(true);
    try {
      await postAgentDeskUpsertDepartment({
        data: {
          slug: editingSlug ?? undefined,
          label: label.trim(),
          color,
          mission: mission.trim() || null,
          constitution_role: constitutionRole,
          accessToken,
          guestId,
        },
      });
      setLabel("");
      setMission("");
      setEditingSlug(null);
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  async function remove(slug: string) {
    if (!confirm("이 부서를 비활성화하시겠습니까?")) return;
    setLoading(true);
    try {
      await postAgentDeskDeleteDepartment({ data: { slug, accessToken, guestId } });
      onSaved();
    } finally {
      setLoading(false);
    }
  }

  return (
    <DialogShell title="조직 설정" subtitle="부서 신설·수정·삭제 (헌법 역할 포함)" onClose={onClose}>
      <div className="space-y-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="부서명 (예: Digital Asset Desk)"
            className="rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
          />
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-xl border border-[#e5e8eb]"
          />
        </div>
        <textarea
          value={mission}
          onChange={(e) => setMission(e.target.value)}
          placeholder="부서 미션 (예: 디지털 자산 리서치·리스크 게이트)"
          rows={2}
          className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
        />
        <select
          value={constitutionRole}
          onChange={(e) => setConstitutionRole(e.target.value as ConstitutionRole)}
          className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {CONSTITUTION_ROLE_META[r].labelKo} — {CONSTITUTION_ROLE_META[r].focus}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void save()}
          disabled={loading || !label.trim()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3182f6] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {editingSlug ? "부서 수정 저장" : "부서 신설"}
        </button>
      </div>

      <div className="mt-4 max-h-48 space-y-1.5 overflow-y-auto">
        {departments.map((d) => (
          <div
            key={d.slug}
            className="flex items-center gap-2 rounded-xl border border-[#f2f4f6] px-3 py-2"
          >
            <span className="size-3 shrink-0 rounded-full" style={{ background: d.color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{d.label}</p>
              <p className="text-[10px] text-[#8b95a1]">
                {d.constitution_role ?? inferConstitutionRole(d.slug)}
                {d.is_custom ? " · 사용자 정의" : ""}
              </p>
            </div>
            <button type="button" onClick={() => startEdit(d)} className="text-xs text-[#3182f6]">
              편집
            </button>
            <button
              type="button"
              onClick={() => void remove(d.slug)}
              className="text-[#ef4444]"
              aria-label="삭제"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </DialogShell>
  );
}

export function DialogShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl ${wide ? "max-w-2xl" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="font-bold text-[#191f28]">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-[#8b95a1]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[#f2f4f6]">
            <X className="size-5 text-[#8b95a1]" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

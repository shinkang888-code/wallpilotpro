import { Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  createAniStudioProject,
  deleteAniStudioProject,
  getAniStudioProjects,
  patchAniStudioEmoji,
} from "@/lib/api/anistudio.functions";
import { EMOJI_SPRITES } from "@/lib/anistudio/defaults";
import type { AniProjectSummary } from "@/lib/anistudio/types";
import type { Department } from "@/lib/office/types";

type Props = {
  departments: Department[];
  accessToken: string | null;
  onBindingsChanged: () => void;
};

export function CharacterDock({ departments, accessToken, onBindingsChanged }: Props) {
  const [projects, setProjects] = useState<AniProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDept, setNewDept] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAniStudioProjects({ data: { accessToken } });
      setProjects(res.projects);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await createAniStudioProject({
        data: {
          name: newName.trim(),
          departmentSlug: newDept || undefined,
          accessToken,
        },
      });
      setNewName("");
      await load();
      onBindingsChanged();
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteAniStudioProject({ data: { projectId: id, accessToken } });
    await load();
    onBindingsChanged();
  }

  async function handleEmoji(id: string, emoji: string) {
    await patchAniStudioEmoji({ data: { projectId: id, emoji, accessToken } });
    await load();
    onBindingsChanged();
  }

  return (
    <div className="rounded-2xl border border-[#e5e8eb] bg-white p-4 shadow-sm">
      <h3 className="text-sm font-bold text-[#191f28]">🎨 AniStudio 캐릭터</h3>
      <p className="mt-1 text-xs text-[#8b95a1]">
        부서별 캐릭터를 생성·수정하면 빌딩 뷰에 경로 애니메이션이 적용됩니다.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="캐릭터 이름"
          className="min-w-0 flex-1 rounded-lg border border-[#e5e8eb] px-2 py-1.5 text-xs"
        />
        <select
          value={newDept}
          onChange={(e) => setNewDept(e.target.value)}
          className="rounded-lg border border-[#e5e8eb] px-2 py-1.5 text-xs"
        >
          <option value="">부서 선택</option>
          {departments.map((d) => (
            <option key={d.slug} value={d.slug}>
              {d.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => void handleCreate()}
          disabled={creating || !newName.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-[#3182f6] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {creating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
          생성
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="size-5 animate-spin text-[#3182f6]" />
        </div>
      ) : projects.length === 0 ? (
        <p className="py-4 text-center text-xs text-[#8b95a1]">등록된 캐릭터가 없습니다.</p>
      ) : (
        <ul className="mt-3 max-h-48 space-y-2 overflow-y-auto">
          {projects.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 rounded-xl border border-[#f2f4f6] bg-[#f9fafb] px-3 py-2"
            >
              <div className="flex gap-0.5">
                {EMOJI_SPRITES.slice(0, 4).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => void handleEmoji(p.id, em)}
                    className="rounded p-0.5 text-sm hover:bg-white"
                    title="이모지 변경"
                  >
                    {em}
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-[#191f28]">{p.name}</p>
                <p className="truncate text-[10px] text-[#8b95a1]">
                  {p.departmentSlug
                    ? departments.find((d) => d.slug === p.departmentSlug)?.label ?? p.departmentSlug
                    : "부서 미지정"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleDelete(p.id)}
                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                aria-label="삭제"
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

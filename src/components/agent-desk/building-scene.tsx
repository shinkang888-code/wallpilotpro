import { useEffect, useMemo, useState } from "react";

import { useRoutePosition } from "@/components/agent-desk/use-route-position";
import type { BuildingRouteBinding } from "@/lib/anistudio/building-binding";
import type { CompanyData, Department, Employee } from "@/lib/office/types";
import { STATUS_META } from "@/lib/office/types";

const FLOOR_TOP = [27, 49.5, 70.5, 95.5];
const COL_LEFT = [24, 44, 63, 82];

const CHITCHAT = [
  "오늘 종목 스캔 결과 공유할게요 📊",
  "Buying Zone 근처네요 👀",
  "리스크 게이트 통과 ✅",
  "Bull/Bear 토론 준비됐어요",
  "Elite 데스크 대기 중 👑",
];

type Slot = { dept: Department; rep: Employee; top: number; left: number };

function DeptCharacter({
  slot,
  index,
  tick,
  binding,
  onSelect,
}: {
  slot: Slot;
  index: number;
  tick: number;
  binding?: BuildingRouteBinding;
  onSelect: (e: Employee) => void;
}) {
  const meta = STATUS_META[slot.rep.status];
  const routePos = useRoutePosition(binding);
  const dur = binding ? binding.durationMs / 1000 : 7 + ((slot.rep.id * 7) % 8);
  const delay = (slot.rep.id * 5) % 6;
  const show = (tick + index) % 2 === 0;
  const msg =
    slot.rep.status === "error"
      ? "🚨 장애 대응 중!"
      : slot.rep.current_task || CHITCHAT[(slot.rep.id + tick) % CHITCHAT.length];

  const top = binding ? routePos.y : slot.top;
  const left = binding ? routePos.x : slot.left;
  const flipX = binding ? routePos.flipX : 1;
  const display = binding?.spriteUrl?.startsWith("data:")
    ? "🎬"
    : binding?.spriteUrl || slot.rep.emoji || "🤖";

  return (
    <div
      className="absolute"
      style={{ top: `${top}%`, left: `${left}%`, transform: "translate(-50%, -100%)" }}
    >
      <div
        className={binding ? "relative" : "ad-building-pace relative"}
        style={
          binding
            ? undefined
            : ({ "--pace-dur": `${dur}s`, "--pace-delay": `${delay}s` } as React.CSSProperties)
        }
      >
        {show && (
          <span className="ad-speech-bubble absolute -top-8 left-1/2 z-10 max-w-[140px] -translate-x-1/2 text-[10px]">
            {binding ? `🎬 ${binding.projectName}` : msg}
          </span>
        )}
        <span
          className="absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[9px] font-semibold text-white shadow"
          style={{ backgroundColor: slot.dept.color }}
        >
          {slot.dept.label}
        </span>
        <button
          type="button"
          onClick={() => onSelect(slot.rep)}
          className="relative flex flex-col items-center transition hover:scale-110"
        >
          <span
            className="flex size-12 items-center justify-center rounded-full text-2xl shadow-lg ring-2"
            style={{
              backgroundColor: `${slot.dept.color}22`,
              borderColor: meta.ring,
              transform: binding ? `scaleX(${flipX}) scale(${binding.scale})` : undefined,
            }}
          >
            {display}
          </span>
          <span className={`absolute -bottom-0.5 right-0 size-2 rounded-full ring-2 ring-white ${meta.dot}`} />
        </button>
      </div>
    </div>
  );
}

type Props = {
  company: CompanyData;
  routeBindings?: Record<string, BuildingRouteBinding>;
  onSelectEmployee: (e: Employee) => void;
};

export function BuildingScene({ company, routeBindings = {}, onSelectEmployee }: Props) {
  const slots = useMemo<Slot[]>(() => {
    const repByDept = new Map<string, Employee>();
    for (const e of company.employees) {
      if (!repByDept.has(e.department_slug)) repByDept.set(e.department_slug, e);
    }
    const ordered = [...company.departments].sort((a, b) => a.sort - b.sort);
    const out: Slot[] = [];
    ordered.forEach((dept, i) => {
      const rep = repByDept.get(dept.slug);
      if (!rep) return;
      const floor = Math.floor(i / 4);
      const col = i % 4;
      const binding = routeBindings[dept.slug];
      out.push({
        dept,
        rep,
        top: binding?.startPercent.y ?? FLOOR_TOP[floor] ?? 95.5,
        left: binding?.startPercent.x ?? COL_LEFT[col] ?? 50,
      });
    });
    return out;
  }, [company, routeBindings]);

  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 2600);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-[#e5e8eb] shadow-sm">
      <div
        className="relative aspect-[3/2] w-full bg-gradient-to-b from-[#1e3a5f] via-[#2d4a6f] to-[#4a6741]"
        aria-hidden
      >
        {[0, 1, 2, 3].map((floor) => (
          <div
            key={floor}
            className="absolute left-[8%] right-[8%] rounded border border-white/10 bg-white/5"
            style={{ top: `${18 + floor * 20}%`, height: "16%" }}
          />
        ))}
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/40 to-transparent" />
        <p className="absolute bottom-2 left-3 text-[10px] font-medium text-white/60">
          WallPilot AI Office · Building View
        </p>
      </div>
      <div className="pointer-events-none absolute inset-0">
        {slots.map((s, i) => (
          <DeptCharacter
            key={s.dept.slug}
            slot={s}
            index={i}
            tick={tick}
            binding={routeBindings[s.dept.slug]}
            onSelect={onSelectEmployee}
          />
        ))}
      </div>
    </div>
  );
}

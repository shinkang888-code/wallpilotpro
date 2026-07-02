import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import type { CeoOrderFsmState } from "@/lib/office/constitution";
import type { CompanyData, Employee } from "@/lib/office/types";

export type FsmAnimationKind = "idle" | "walking" | "working" | "creative" | "meeting";

export type FsmAgentSnapshot = {
  employee_slug: string;
  employee_name: string;
  department_slug: string;
  department_label: string;
  left_pct: number;
  top_pct: number;
  animation: FsmAnimationKind;
  message: string;
  emoji: string | null;
};

export type OfficeFsmSnapshot = {
  id: number;
  order_id: string | null;
  fsm_state: string;
  version: number;
  agents: FsmAgentSnapshot[];
  created_at: string;
};

const CEO_MEETING_ZONE = { left: 50, top: 88 };

function defaultPosition(emp: Employee, deptIndex: number, empIndex: number): {
  left: number;
  top: number;
} {
  if (emp.workspace_x_pct != null && emp.workspace_y_pct != null) {
    return { left: Number(emp.workspace_x_pct), top: Number(emp.workspace_y_pct) };
  }
  const col = deptIndex % 4;
  const row = Math.floor(deptIndex / 4);
  return {
    left: 18 + col * 22 + (empIndex % 2) * 4,
    top: 28 + row * 22 + Math.floor(empIndex / 2) * 6,
  };
}

export function buildFsmSnapshot(
  company: CompanyData,
  fsmState: CeoOrderFsmState,
  orderId: string | null,
  version: number,
  focusDeptSlugs?: string[],
): Omit<OfficeFsmSnapshot, "id" | "created_at"> {
  const leaders = company.departments
    .map((dept, deptIndex) => {
      const emps = company.employees.filter((e) => e.department_slug === dept.slug);
      const leader = emps.find((e) => e.is_leader) ?? emps[0];
      if (!leader) return null;
      return { dept, leader, deptIndex };
    })
    .filter(Boolean) as Array<{ dept: CompanyData["departments"][0]; leader: Employee; deptIndex: number }>;

  const agents: FsmAgentSnapshot[] = leaders.map(({ dept, leader, deptIndex }, i) => {
    const isFocus = !focusDeptSlugs?.length || focusDeptSlugs.includes(dept.slug);
    let pos = defaultPosition(leader, deptIndex, i);
    let animation: FsmAnimationKind = "idle";
    let message = leader.current_task ?? `${dept.label} 대기`;

    if (fsmState === "RUNNING" && isFocus) {
      animation = leader.constitution_role === "researcher" ? "creative" : "working";
      message = `업무 실행 중: ${leader.name}`;
    } else if (fsmState === "WAITING_APPROVAL") {
      pos = {
        left: CEO_MEETING_ZONE.left + (i - leaders.length / 2) * 8,
        top: CEO_MEETING_ZONE.top,
      };
      animation = "meeting";
      message = "CEO 승인 대기 중";
    } else if (fsmState === "COMPLETED") {
      animation = "idle";
      message = "보고서 보관 완료";
    } else if (fsmState === "CEO_INPUTED") {
      animation = "walking";
      message = "지시 접수";
    }

    return {
      employee_slug: leader.slug,
      employee_name: leader.name,
      department_slug: dept.slug,
      department_label: dept.label,
      left_pct: pos.left,
      top_pct: pos.top,
      animation,
      message,
      emoji: leader.emoji,
    };
  });

  return { order_id: orderId, fsm_state: fsmState, version, agents };
}

export async function appendFsmSnapshot(
  userId: string,
  snapshot: Omit<OfficeFsmSnapshot, "id" | "created_at">,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("office_fsm_snapshots").insert({
    user_id: userId,
    order_id: snapshot.order_id,
    fsm_state: snapshot.fsm_state,
    version: snapshot.version,
    agents: snapshot.agents,
  });
}

export async function loadFsmSnapshots(
  userId: string,
  opts?: { orderId?: string; sinceId?: number; limit?: number },
): Promise<OfficeFsmSnapshot[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  let q = admin
    .from("office_fsm_snapshots")
    .select("id, order_id, fsm_state, version, agents, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: true })
    .limit(opts?.limit ?? 100);

  if (opts?.orderId) q = q.eq("order_id", opts.orderId);
  if (opts?.sinceId) q = q.gt("id", opts.sinceId);

  const { data } = await q;
  return (data ?? []).map((row) => ({
    id: row.id as number,
    order_id: (row.order_id as string) ?? null,
    fsm_state: row.fsm_state as string,
    version: row.version as number,
    agents: row.agents as FsmAgentSnapshot[],
    created_at: row.created_at as string,
  }));
}

export async function loadLatestFsmSnapshot(userId: string): Promise<OfficeFsmSnapshot | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data } = await admin
    .from("office_fsm_snapshots")
    .select("id, order_id, fsm_state, version, agents, created_at")
    .eq("user_id", userId)
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id as number,
    order_id: (data.order_id as string) ?? null,
    fsm_state: data.fsm_state as string,
    version: data.version as number,
    agents: data.agents as FsmAgentSnapshot[],
    created_at: data.created_at as string,
  };
}

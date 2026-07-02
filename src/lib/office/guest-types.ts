import type { CeoOrder } from "@/lib/office/types";
import type { OfficeFsmSnapshot } from "@/lib/office/office-fsm.server";
import type { OfficeEvent, OfficeReport } from "@/lib/office/types";

export type GuestDeptRow = {
  slug: string;
  label: string;
  color: string;
  icon: string | null;
  sort: number;
  is_active: boolean;
  mission: string | null;
  constitution_role: string;
};

export type GuestEmpRow = {
  seed_employee_id: number | null;
  slug: string;
  department_slug: string;
  name: string;
  description: string | null;
  emoji: string | null;
  vibe: string | null;
  constitution_role: string;
  constitution_prompt: string | null;
  is_leader: boolean;
  sort: number;
  is_active: boolean;
  status: string;
  current_task: string | null;
  workspace_x_pct: number | null;
  workspace_y_pct: number | null;
};

export type GuestWorkspacePayload = {
  departments: GuestDeptRow[];
  employees: GuestEmpRow[];
  reports: OfficeReport[];
  ceo_orders: CeoOrder[];
  fsm_snapshots: OfficeFsmSnapshot[];
  dept_profiles: Record<string, string>;
  events: OfficeEvent[];
};

export const EMPTY_GUEST_PAYLOAD: GuestWorkspacePayload = {
  departments: [],
  employees: [],
  reports: [],
  ceo_orders: [],
  fsm_snapshots: [],
  dept_profiles: {},
  events: [],
};

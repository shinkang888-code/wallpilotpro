export type EmployeeStatus = "working" | "meeting" | "review" | "idle" | "error";

export type Department = {
  slug: string;
  label: string;
  color: string;
  icon: string | null;
  sort: number;
  real_member_name: string | null;
  has_real_avatar: boolean;
  mission?: string | null;
  constitution_role?: string | null;
  is_custom?: boolean;
  is_active?: boolean;
};

export type Employee = {
  id: number;
  slug: string;
  department_slug: string;
  name: string;
  description: string | null;
  color: string | null;
  emoji: string | null;
  vibe: string | null;
  status: EmployeeStatus;
  current_task: string | null;
  constitution_role?: string | null;
  constitution_prompt?: string | null;
  is_leader?: boolean;
  is_custom?: boolean;
  workspace_x_pct?: number | null;
  workspace_y_pct?: number | null;
};

export type Site = {
  id: number;
  name: string;
  url: string;
  department_slug: string | null;
  status: "up" | "down" | "unknown";
  http_code: number | null;
  last_checked: string | null;
};

export type OfficeStats = {
  total: number;
  working: number;
  meeting: number;
  idle: number;
  departments: number;
};

export type CompanyData = {
  departments: Department[];
  employees: Employee[];
  sites: Site[];
  stats: OfficeStats;
};

export type OfficeEvent = {
  id: number;
  ts: string;
  actor: string | null;
  message: string;
  kind?: "system" | "task" | "alert";
  task_id?: string;
  progress_pct?: number;
  task_status?: "assigned" | "running" | "completed" | "failed";
  report_summary?: string | null;
  department_slug?: string | null;
  employee_slug?: string | null;
};

export const STATUS_META: Record<
  EmployeeStatus,
  { label: string; ring: string; dot: string }
> = {
  working: { label: "근무중", ring: "#22c55e", dot: "bg-emerald-500" },
  meeting: { label: "회의중", ring: "#3182f6", dot: "bg-[#3182f6]" },
  review: { label: "검토중", ring: "#f59e0b", dot: "bg-amber-500" },
  idle: { label: "대기", ring: "#94a3b8", dot: "bg-slate-400" },
  error: { label: "장애대응", ring: "#ef4444", dot: "bg-red-500" },
};

export type OfficeChatResult = {
  summary: string;
  body: string;
  links: Array<{ label: string; url: string }>;
  llm_vendor?: "openai" | "gemini" | null;
  llm_fallback?: boolean;
};

export type DeptReportInput = {
  deptLabel: string;
  deptSlug: string;
  leaderName: string;
  items: string[];
};

export type OfficeReport = {
  id: number;
  department_slug: string;
  department_label: string;
  employee_slug: string | null;
  employee_name: string | null;
  title: string;
  summary: string | null;
  body: string;
  user_prompt: string | null;
  links: Array<{ label: string; url: string }>;
  source_type: string;
  ceo_order_id: string | null;
  fsm_state: string;
  artifact_path?: string | null;
  created_at: string;
};

export type CeoOrder = {
  id: string;
  message: string;
  target_mode: string;
  target_dept_slugs: string[];
  status: string;
  fsm_state: string;
  version: number;
  artifact_path?: string | null;
  created_at: string;
  completed_at: string | null;
  results?: CeoOrderResult[];
};

export type CeoOrderResult = {
  id: number;
  department_slug: string;
  department_label: string;
  employee_slug: string | null;
  employee_name: string | null;
  summary: string | null;
  body: string | null;
  status: string;
  error_message: string | null;
};

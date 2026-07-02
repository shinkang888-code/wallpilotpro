import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import { inferConstitutionRole } from "@/lib/office/constitution";
import { buildSeedCompany } from "@/lib/office/seed-agency";
import type {
  CeoOrder,
  CeoOrderResult,
  CompanyData,
  Department,
  Employee,
  EmployeeStatus,
  OfficeReport,
} from "@/lib/office/types";

type UserDeptRow = {
  slug: string;
  label: string;
  color: string;
  icon: string | null;
  sort: number;
  is_active: boolean;
  mission: string | null;
  constitution_role: string;
};

type UserEmpRow = {
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

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `dept-${Date.now()}`;
}

export async function loadUserOfficeOverlay(userId: string): Promise<{
  departments: UserDeptRow[];
  employees: UserEmpRow[];
}> {
  if (!isSupabaseConfigured()) return { departments: [], employees: [] };
  const admin = getSupabaseAdmin();
  if (!admin) return { departments: [], employees: [] };

  const [{ data: depts }, { data: emps }] = await Promise.all([
    admin.from("office_user_departments").select("*").eq("user_id", userId).order("sort"),
    admin.from("office_user_employees").select("*").eq("user_id", userId).order("sort"),
  ]);

  return {
    departments: (depts ?? []) as UserDeptRow[],
    employees: (emps ?? []) as UserEmpRow[],
  };
}

export function mergeOfficeCompany(
  base: CompanyData,
  overlay: { departments: UserDeptRow[]; employees: UserEmpRow[] },
): CompanyData {
  const deptMap = new Map(base.departments.map((d) => [d.slug, { ...d }]));
  const hiddenSlugs = new Set<string>();

  for (const row of overlay.departments) {
    if (!row.is_active) {
      hiddenSlugs.add(row.slug);
      continue;
    }
    const existing = deptMap.get(row.slug);
    deptMap.set(row.slug, {
      slug: row.slug,
      label: row.label,
      color: row.color,
      icon: row.icon ?? existing?.icon ?? null,
      sort: row.sort,
      real_member_name: existing?.real_member_name ?? null,
      has_real_avatar: existing?.has_real_avatar ?? false,
      mission: row.mission,
      constitution_role: row.constitution_role,
      is_custom: !existing,
      is_active: true,
    });
  }

  let departments = [...deptMap.values()]
    .filter((d) => !hiddenSlugs.has(d.slug) && d.is_active !== false)
    .sort((a, b) => a.sort - b.sort);

  const empOverrides = new Map<string, UserEmpRow>();
  for (const row of overlay.employees) {
    empOverrides.set(row.slug, row);
  }

  const hiddenEmpSlugs = new Set(
    overlay.employees.filter((e) => !e.is_active).map((e) => e.slug),
  );

  let nextId = Math.max(0, ...base.employees.map((e) => e.id)) + 1;
  const employees: Employee[] = [];

  for (const seed of base.employees) {
    const ov = empOverrides.get(seed.slug);
    if (hiddenEmpSlugs.has(seed.slug)) continue;
    if (ov && !ov.is_active) continue;
    if (hiddenSlugs.has(ov?.department_slug ?? seed.department_slug)) continue;

    employees.push({
      ...seed,
      department_slug: ov?.department_slug ?? seed.department_slug,
      name: ov?.name ?? seed.name,
      description: ov?.description ?? seed.description,
      emoji: ov?.emoji ?? seed.emoji,
      vibe: ov?.vibe ?? seed.vibe,
      constitution_role: ov?.constitution_role ?? inferConstitutionRole(seed.department_slug),
      constitution_prompt: ov?.constitution_prompt ?? null,
      is_leader: ov?.is_leader ?? false,
      is_custom: false,
      status: (ov?.status as EmployeeStatus) ?? seed.status,
      current_task: ov?.current_task ?? seed.current_task,
      workspace_x_pct: ov?.workspace_x_pct ?? null,
      workspace_y_pct: ov?.workspace_y_pct ?? null,
    });
    empOverrides.delete(seed.slug);
  }

  for (const ov of overlay.employees) {
    if (!ov.is_active || hiddenEmpSlugs.has(ov.slug)) continue;
    if (hiddenSlugs.has(ov.department_slug)) continue;
    if (base.employees.some((e) => e.slug === ov.slug)) continue;

    employees.push({
      id: ov.seed_employee_id ?? nextId++,
      slug: ov.slug,
      department_slug: ov.department_slug,
      name: ov.name,
      description: ov.description,
      color: departments.find((d) => d.slug === ov.department_slug)?.color ?? "#3182f6",
      emoji: ov.emoji ?? "🤖",
      vibe: ov.vibe,
      constitution_role: ov.constitution_role,
      constitution_prompt: ov.constitution_prompt,
      is_leader: ov.is_leader,
      is_custom: true,
      status: (ov.status as EmployeeStatus) ?? "idle",
      current_task: ov.current_task,
      workspace_x_pct: ov.workspace_x_pct,
      workspace_y_pct: ov.workspace_y_pct,
    });
  }

  for (const row of overlay.departments) {
    if (!row.is_active || deptMap.has(row.slug)) continue;
    departments.push({
      slug: row.slug,
      label: row.label,
      color: row.color,
      icon: row.icon,
      sort: row.sort,
      real_member_name: null,
      has_real_avatar: false,
      mission: row.mission,
      constitution_role: row.constitution_role,
      is_custom: true,
      is_active: true,
    });
  }

  departments = departments.sort((a, b) => a.sort - b.sort);

  const leaderSet = new Set(
    employees.filter((e) => e.is_leader).map((e) => e.department_slug),
  );
  for (const dept of departments) {
    if (leaderSet.has(dept.slug)) continue;
    const deptEmps = employees
      .filter((e) => e.department_slug === dept.slug)
      .sort((a, b) => a.id - b.id);
    if (deptEmps[0]) deptEmps[0].is_leader = true;
  }

  const deptSlugs = new Set(departments.map((d) => d.slug));
  const filteredEmployees = employees.filter((e) => deptSlugs.has(e.department_slug));

  const working = filteredEmployees.filter((e) => e.status === "working").length;
  const meeting = filteredEmployees.filter((e) => e.status === "meeting").length;
  const idle = filteredEmployees.filter((e) => e.status === "idle").length;

  return {
    departments,
    employees: filteredEmployees,
    sites: base.sites.filter(
      (s) => !s.department_slug || deptSlugs.has(s.department_slug),
    ),
    stats: {
      total: filteredEmployees.length,
      working,
      meeting,
      idle,
      departments: departments.length,
    },
  };
}

export async function upsertUserDepartment(
  userId: string,
  input: {
    slug?: string;
    label: string;
    color: string;
    icon?: string | null;
    mission?: string | null;
    constitution_role?: string;
    sort?: number;
  },
): Promise<Department> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const slug = input.slug?.trim() || slugify(input.label);
  const base = buildSeedCompany();
  const sort =
    input.sort ??
    base.departments.find((d) => d.slug === slug)?.sort ??
    base.departments.length;

  await admin.from("office_user_departments").upsert(
    {
      user_id: userId,
      slug,
      label: input.label.trim(),
      color: input.color,
      icon: input.icon ?? null,
      mission: input.mission?.trim() || null,
      constitution_role: input.constitution_role ?? inferConstitutionRole(slug),
      sort,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,slug" },
  );

  const company = await loadMergedCompany(userId);
  const dept = company.departments.find((d) => d.slug === slug);
  if (!dept) throw new Error("dept_not_found");
  return dept;
}

export async function deactivateUserDepartment(userId: string, slug: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const base = buildSeedCompany();
  const existing = base.departments.find((d) => d.slug === slug);
  const overlay = await loadUserOfficeOverlay(userId);
  const custom = overlay.departments.find((d) => d.slug === slug);

  await admin.from("office_user_departments").upsert(
    {
      user_id: userId,
      slug,
      label: custom?.label ?? existing?.label ?? slug,
      color: custom?.color ?? existing?.color ?? "#8b95a1",
      icon: custom?.icon ?? existing?.icon ?? null,
      sort: custom?.sort ?? existing?.sort ?? 999,
      is_active: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,slug" },
  );
}

export async function upsertUserEmployee(
  userId: string,
  input: {
    slug?: string;
    department_slug: string;
    name: string;
    description?: string | null;
    emoji?: string | null;
    vibe?: string | null;
    constitution_role?: string;
    constitution_prompt?: string | null;
    is_leader?: boolean;
    seed_employee_id?: number | null;
  },
): Promise<Employee> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const slug = input.slug?.trim() || slugify(input.name);

  if (input.is_leader) {
    await admin
      .from("office_user_employees")
      .update({ is_leader: false, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("department_slug", input.department_slug);
  }

  await admin.from("office_user_employees").upsert(
    {
      user_id: userId,
      slug,
      department_slug: input.department_slug,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      emoji: input.emoji ?? "🤖",
      vibe: input.vibe?.trim() || null,
      constitution_role:
        input.constitution_role ?? inferConstitutionRole(input.department_slug),
      constitution_prompt: input.constitution_prompt?.trim() || null,
      is_leader: input.is_leader ?? false,
      seed_employee_id: input.seed_employee_id ?? null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,slug" },
  );

  const company = await loadMergedCompany(userId);
  const emp = company.employees.find((e) => e.slug === slug);
  if (!emp) throw new Error("employee_not_found");
  return emp;
}

export async function deactivateUserEmployee(userId: string, slug: string): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  await admin
    .from("office_user_employees")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("slug", slug);
}

export async function loadMergedCompany(userId: string | null): Promise<CompanyData> {
  const base = buildSeedCompany();
  if (!userId || !isSupabaseConfigured()) return base;

  const overlay = await loadUserOfficeOverlay(userId);
  const merged = mergeOfficeCompany(base, overlay);

  const admin = getSupabaseAdmin();
  if (admin) {
    const { data: profiles } = await admin
      .from("office_dept_profiles")
      .select("dept_slug, real_member_name")
      .eq("user_id", userId);

    if (profiles?.length) {
      const map = new Map(profiles.map((p) => [p.dept_slug, p.real_member_name]));
      merged.departments = merged.departments.map((d) => ({
        ...d,
        real_member_name: map.get(d.slug) ?? d.real_member_name,
      }));
    }
  }

  return merged;
}

export async function saveOfficeReport(
  userId: string,
  report: Omit<OfficeReport, "id" | "created_at">,
): Promise<OfficeReport> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const { data, error } = await admin
    .from("office_reports")
    .insert({
      user_id: userId,
      department_slug: report.department_slug,
      department_label: report.department_label,
      employee_slug: report.employee_slug,
      employee_name: report.employee_name,
      title: report.title,
      summary: report.summary,
      body: report.body,
      user_prompt: report.user_prompt,
      links: report.links,
      source_type: report.source_type,
      ceo_order_id: report.ceo_order_id,
      fsm_state: report.fsm_state,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("report_save_failed");

  return mapReportRow(data);
}

export async function loadOfficeReports(
  userId: string,
  limit = 50,
): Promise<OfficeReport[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("office_reports")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapReportRow);
}

function mapReportRow(row: Record<string, unknown>): OfficeReport {
  return {
    id: row.id as number,
    department_slug: row.department_slug as string,
    department_label: row.department_label as string,
    employee_slug: (row.employee_slug as string) ?? null,
    employee_name: (row.employee_name as string) ?? null,
    title: row.title as string,
    summary: (row.summary as string) ?? null,
    body: row.body as string,
    user_prompt: (row.user_prompt as string) ?? null,
    links: (row.links as OfficeReport["links"]) ?? [],
    source_type: row.source_type as string,
    ceo_order_id: (row.ceo_order_id as string) ?? null,
    fsm_state: row.fsm_state as string,
    created_at: row.created_at as string,
  };
}

export async function createCeoOrder(
  userId: string,
  input: { message: string; target_mode: string; target_dept_slugs: string[] },
): Promise<CeoOrder> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const { data, error } = await admin
    .from("office_ceo_orders")
    .insert({
      user_id: userId,
      message: input.message.trim(),
      target_mode: input.target_mode,
      target_dept_slugs: input.target_dept_slugs,
      status: "pending",
      fsm_state: "CEO_INPUTED",
      version: 1,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error("ceo_order_failed");
  return mapCeoOrderRow(data);
}

export async function updateCeoOrderFsm(
  userId: string,
  orderId: string,
  patch: { fsm_state?: string; status?: string; completed_at?: string | null },
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  await admin
    .from("office_ceo_orders")
    .update(patch)
    .eq("user_id", userId)
    .eq("id", orderId);
}

export async function saveCeoOrderResult(
  orderId: string,
  result: Omit<CeoOrderResult, "id">,
): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  await admin.from("office_ceo_order_results").insert({
    order_id: orderId,
    department_slug: result.department_slug,
    department_label: result.department_label,
    employee_slug: result.employee_slug,
    employee_name: result.employee_name,
    summary: result.summary,
    body: result.body,
    status: result.status,
    error_message: result.error_message,
  });
}

export async function loadCeoOrders(userId: string, limit = 20): Promise<CeoOrder[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data: orders } = await admin
    .from("office_ceo_orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!orders?.length) return [];

  const ids = orders.map((o) => o.id as string);
  const { data: results } = await admin
    .from("office_ceo_order_results")
    .select("*")
    .in("order_id", ids);

  const byOrder = new Map<string, CeoOrderResult[]>();
  for (const r of results ?? []) {
    const oid = r.order_id as string;
    const arr = byOrder.get(oid) ?? [];
    arr.push({
      id: r.id as number,
      department_slug: r.department_slug as string,
      department_label: r.department_label as string,
      employee_slug: (r.employee_slug as string) ?? null,
      employee_name: (r.employee_name as string) ?? null,
      summary: (r.summary as string) ?? null,
      body: (r.body as string) ?? null,
      status: r.status as string,
      error_message: (r.error_message as string) ?? null,
    });
    byOrder.set(oid, arr);
  }

  return orders.map((o) => ({
    ...mapCeoOrderRow(o),
    results: byOrder.get(o.id as string) ?? [],
  }));
}

function mapCeoOrderRow(row: Record<string, unknown>): CeoOrder {
  return {
    id: row.id as string,
    message: row.message as string,
    target_mode: row.target_mode as string,
    target_dept_slugs: (row.target_dept_slugs as string[]) ?? [],
    status: row.status as string,
    fsm_state: row.fsm_state as string,
    version: row.version as number,
    created_at: row.created_at as string,
    completed_at: (row.completed_at as string) ?? null,
  };
}

export async function approveCeoOrder(userId: string, orderId: string): Promise<CeoOrder> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("db_unavailable");

  const orders = await loadCeoOrders(userId, 50);
  const order = orders.find((o) => o.id === orderId);
  if (!order) throw new Error("order_not_found");

  for (const r of order.results ?? []) {
    if (r.status !== "done" || !r.body) continue;
    await saveOfficeReport(userId, {
      department_slug: r.department_slug,
      department_label: r.department_label,
      employee_slug: r.employee_slug,
      employee_name: r.employee_name,
      title: `[일괄지시] ${r.department_label} 보고`,
      summary: r.summary,
      body: r.body,
      user_prompt: order.message,
      links: [],
      source_type: "ceo_bulk",
      ceo_order_id: orderId,
      fsm_state: "COMPLETED",
    });
  }

  await updateCeoOrderFsm(userId, orderId, {
    fsm_state: "COMPLETED",
    status: "completed",
    completed_at: new Date().toISOString(),
  });

  const updated = (await loadCeoOrders(userId, 50)).find((o) => o.id === orderId);
  if (!updated) throw new Error("order_not_found");
  return updated;
}

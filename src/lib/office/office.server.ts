import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import { buildSeedCompany, buildSeedEvents } from "@/lib/office/seed-agency";
import type {
  CompanyData,
  Department,
  Employee,
  EmployeeStatus,
  OfficeEvent,
  Site,
} from "@/lib/office/types";

type ProfileRow = {
  dept_slug: string;
  real_member_name: string | null;
};

type EventRow = {
  id: number;
  actor: string | null;
  message: string;
  created_at: string;
};

export async function loadOfficeCompany(userId: string | null): Promise<CompanyData> {
  const base = buildSeedCompany();

  if (!userId || !isSupabaseConfigured()) return base;

  const admin = getSupabaseAdmin();
  if (!admin) return base;

  const { data: profiles } = await admin
    .from("office_dept_profiles")
    .select("dept_slug, real_member_name")
    .eq("user_id", userId);

  if (profiles?.length) {
    const map = new Map(
      (profiles as ProfileRow[]).map((p) => [p.dept_slug, p.real_member_name]),
    );
    base.departments = base.departments.map((d) => ({
      ...d,
      real_member_name: map.get(d.slug) ?? d.real_member_name,
    }));
  }

  return base;
}

export async function loadOfficeEvents(userId: string | null): Promise<OfficeEvent[]> {
  const seed = buildSeedEvents();

  if (!userId || !isSupabaseConfigured()) return seed;

  const admin = getSupabaseAdmin();
  if (!admin) return seed;

  const { data: rows } = await admin
    .from("office_event_log")
    .select("id, actor, message, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (!rows?.length) return seed;

  const dbEvents: OfficeEvent[] = (rows as EventRow[]).map((r) => ({
    id: r.id,
    ts: r.created_at,
    actor: r.actor,
    message: r.message,
  }));

  return [...dbEvents, ...seed].slice(0, 60);
}

export async function saveDeptProfile(
  userId: string,
  deptSlug: string,
  realMemberName: string,
): Promise<Department | null> {
  if (!isSupabaseConfigured()) return null;

  const admin = getSupabaseAdmin();
  if (!admin) return null;

  await admin.from("office_dept_profiles").upsert(
    {
      user_id: userId,
      dept_slug: deptSlug,
      real_member_name: realMemberName.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,dept_slug" },
  );

  const company = await loadOfficeCompany(userId);
  return company.departments.find((d) => d.slug === deptSlug) ?? null;
}

export async function appendOfficeEvent(
  userId: string,
  actor: string | null,
  message: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("office_event_log").insert({
    user_id: userId,
    actor,
    message,
  });
}

export async function patchEmployeeTask(
  userId: string,
  employeeId: number,
  patch: { status?: EmployeeStatus; current_task?: string },
): Promise<Employee | null> {
  const company = await loadOfficeCompany(userId);
  const emp = company.employees.find((e) => e.id === employeeId);
  if (!emp) return null;

  if (patch.status) emp.status = patch.status;
  if (patch.current_task !== undefined) emp.current_task = patch.current_task;

  await appendOfficeEvent(
    userId,
    emp.name,
    patch.current_task ?? `${emp.name} 상태 → ${patch.status ?? emp.status}`,
  );

  return emp;
}

export async function checkOfficeSites(userId: string): Promise<Site[]> {
  const company = await loadOfficeCompany(userId);
  const results: Site[] = [];

  for (const site of company.sites) {
    let status: Site["status"] = "unknown";
    let httpCode: number | null = null;

    try {
      const res = await fetch(site.url, {
        method: "HEAD",
        signal: AbortSignal.timeout(8000),
      });
      httpCode = res.status;
      status = res.ok ? "up" : "down";
    } catch {
      status = "down";
    }

    results.push({
      ...site,
      status,
      http_code: httpCode,
      last_checked: new Date().toISOString(),
    });

    if (status === "down") {
      await appendOfficeEvent(
        userId,
        site.name,
        `사이트 장애 감지 — ${site.url} (HTTP ${httpCode ?? "timeout"})`,
      );
    }
  }

  return results;
}

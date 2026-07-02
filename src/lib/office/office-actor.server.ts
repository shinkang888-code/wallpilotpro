import { randomUUID } from "node:crypto";

import type { CeoOrderFsmState } from "@/lib/office/constitution";
import { inferConstitutionRole } from "@/lib/office/constitution";
import {
  loadGuestWorkspace,
  saveGuestWorkspace,
  type OfficeActor,
} from "@/lib/office/guest-office.server";
import type { GuestEmpRow, GuestWorkspacePayload } from "@/lib/office/guest-types";
import {
  appendFsmSnapshot,
  buildFsmSnapshot,
  loadFsmSnapshots,
  loadLatestFsmSnapshot,
  type OfficeFsmSnapshot,
} from "@/lib/office/office-fsm.server";
import {
  approveCeoOrder,
  createCeoOrder,
  deactivateUserDepartment,
  deactivateUserEmployee,
  emitCeoOrderFsm,
  loadCeoOrders,
  loadMergedCompany,
  loadOfficeReports,
  mergeOfficeCompany,
  saveCeoOrderResult,
  saveOfficeReport,
  updateCeoOrderFsm,
  upsertUserDepartment,
  upsertUserEmployee,
} from "@/lib/office/office-config.server";
import { buildSeedCompany, buildSeedEvents } from "@/lib/office/seed-agency";
import type {
  CeoOrder,
  CeoOrderResult,
  CompanyData,
  Department,
  Employee,
  OfficeEvent,
  OfficeReport,
} from "@/lib/office/types";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `item-${Date.now()}`;
}

async function loadGuestPayload(actor: OfficeActor): Promise<GuestWorkspacePayload> {
  if (actor.kind !== "guest") throw new Error("invalid_actor");
  return loadGuestWorkspace(actor.id);
}

async function persistGuest(actor: OfficeActor, payload: GuestWorkspacePayload): Promise<void> {
  if (actor.kind !== "guest") throw new Error("invalid_actor");
  await saveGuestWorkspace(actor.id, payload);
}

export async function loadCompanyForActor(actor: OfficeActor | null): Promise<CompanyData> {
  if (!actor) return buildSeedCompany();
  if (actor.kind === "user") return loadMergedCompany(actor.id);

  const payload = await loadGuestPayload(actor);
  const merged = mergeOfficeCompany(buildSeedCompany(), {
    departments: payload.departments,
    employees: payload.employees,
  });
  merged.departments = merged.departments.map((d) => ({
    ...d,
    real_member_name: payload.dept_profiles[d.slug] ?? d.real_member_name,
  }));
  return merged;
}

export async function loadEventsForActor(actor: OfficeActor | null): Promise<OfficeEvent[]> {
  const seed = buildSeedEvents();
  if (!actor) return seed;
  if (actor.kind === "user") {
    const { loadOfficeEvents } = await import("@/lib/office/office.server");
    return loadOfficeEvents(actor.id);
  }
  const payload = await loadGuestPayload(actor);
  return [...payload.events, ...seed].slice(0, 60);
}

export async function appendEventForActor(
  actor: OfficeActor,
  who: string | null,
  message: string,
  meta?: Partial<OfficeEvent>,
): Promise<void> {
  if (actor.kind === "user") {
    const { appendOfficeEvent } = await import("@/lib/office/office.server");
    await appendOfficeEvent(actor.id, who, message, meta as Record<string, unknown>);
    return;
  }
  const payload = await loadGuestPayload(actor);
  payload.events.unshift({
    id: Date.now(),
    ts: new Date().toISOString(),
    actor: who,
    message,
    ...meta,
  });
  payload.events = payload.events.slice(0, 50);
  await persistGuest(actor, payload);
}

export type TaskEventInput = {
  task_id: string;
  actor: string | null;
  message: string;
  progress_pct: number;
  task_status: OfficeEvent["task_status"];
  department_slug?: string;
  employee_slug?: string | null;
  report_summary?: string | null;
};

export async function startTaskEventForActor(
  actor: OfficeActor,
  input: TaskEventInput,
): Promise<void> {
  await appendEventForActor(actor, input.actor, input.message, {
    kind: "task",
    task_id: input.task_id,
    progress_pct: input.progress_pct,
    task_status: input.task_status,
    department_slug: input.department_slug ?? null,
    employee_slug: input.employee_slug ?? null,
    report_summary: null,
  });
}

export async function updateTaskEventForActor(
  actor: OfficeActor,
  taskId: string,
  patch: {
    message: string;
    progress_pct: number;
    task_status: OfficeEvent["task_status"];
    report_summary?: string | null;
  },
): Promise<void> {
  if (actor.kind === "user") {
    const { loadOfficeEvents, updateOfficeEventMeta } = await import("@/lib/office/office.server");
    const events = await loadOfficeEvents(actor.id);
    const row = events.find((e) => e.task_id === taskId);
    if (!row) {
      await appendEventForActor(actor, null, patch.message, {
        kind: "task",
        task_id: taskId,
        progress_pct: patch.progress_pct,
        task_status: patch.task_status,
        report_summary: patch.report_summary ?? null,
      });
      return;
    }
    await updateOfficeEventMeta(actor.id, row.id, {
      message: patch.message,
      meta: {
        kind: "task",
        task_id: taskId,
        progress_pct: patch.progress_pct,
        task_status: patch.task_status,
        report_summary: patch.report_summary ?? null,
        department_slug: row.department_slug ?? null,
        employee_slug: row.employee_slug ?? null,
      },
    });
    return;
  }

  const payload = await loadGuestPayload(actor);
  const idx = payload.events.findIndex((e) => e.task_id === taskId);
  if (idx < 0) {
    await startTaskEventForActor(actor, {
      task_id: taskId,
      actor: null,
      message: patch.message,
      progress_pct: patch.progress_pct,
      task_status: patch.task_status,
      report_summary: patch.report_summary,
    });
    return;
  }
  payload.events[idx] = {
    ...payload.events[idx],
    message: patch.message,
    progress_pct: patch.progress_pct,
    task_status: patch.task_status,
    report_summary: patch.report_summary ?? null,
    ts: new Date().toISOString(),
  };
  await persistGuest(actor, payload);
}

export async function loadReportsForActor(actor: OfficeActor | null): Promise<OfficeReport[]> {
  if (!actor) return [];
  if (actor.kind === "user") return loadOfficeReports(actor.id);
  const payload = await loadGuestPayload(actor);
  return payload.reports;
}

export async function saveReportForActor(
  actor: OfficeActor,
  report: Omit<OfficeReport, "id" | "created_at">,
): Promise<void> {
  if (actor.kind === "user") {
    await saveOfficeReport(actor.id, report);
    return;
  }
  const payload = await loadGuestPayload(actor);
  const id = (payload.reports[0]?.id ?? 0) + 1;
  payload.reports.unshift({
    ...report,
    id,
    created_at: new Date().toISOString(),
  });
  payload.reports = payload.reports.slice(0, 100);
  await persistGuest(actor, payload);
}

export async function loadCeoOrdersForActor(actor: OfficeActor | null): Promise<CeoOrder[]> {
  if (!actor) return [];
  if (actor.kind === "user") return loadCeoOrders(actor.id);
  const payload = await loadGuestPayload(actor);
  return payload.ceo_orders;
}

export async function loadLatestFsmForActor(actor: OfficeActor | null): Promise<OfficeFsmSnapshot | null> {
  if (!actor) return null;
  if (actor.kind === "user") return loadLatestFsmSnapshot(actor.id);
  const payload = await loadGuestPayload(actor);
  return payload.fsm_snapshots[payload.fsm_snapshots.length - 1] ?? null;
}

export async function loadFsmHistoryForActor(
  actor: OfficeActor | null,
  orderId?: string,
): Promise<OfficeFsmSnapshot[]> {
  if (!actor) return [];
  if (actor.kind === "user") return loadFsmSnapshots(actor.id, { orderId, limit: 50 });
  const payload = await loadGuestPayload(actor);
  let snaps = payload.fsm_snapshots;
  if (orderId) snaps = snaps.filter((s) => s.order_id === orderId);
  return snaps.slice(-50);
}

async function emitFsmForActor(
  actor: OfficeActor,
  company: CompanyData,
  orderId: string,
  state: CeoOrderFsmState,
  version: number,
  targetSlugs?: string[],
): Promise<void> {
  if (actor.kind === "user") {
    await emitCeoOrderFsm(actor.id, company, orderId, state, version, targetSlugs);
    return;
  }
  const snap = buildFsmSnapshot(company, state, orderId, version, targetSlugs);
  const payload = await loadGuestPayload(actor);
  payload.fsm_snapshots.push({ ...snap, id: payload.fsm_snapshots.length + 1, created_at: new Date().toISOString() });
  payload.fsm_snapshots = payload.fsm_snapshots.slice(-80);
  await persistGuest(actor, payload);
}

export async function upsertDepartmentForActor(
  actor: OfficeActor,
  input: {
    slug?: string;
    label: string;
    color: string;
    icon?: string | null;
    mission?: string | null;
    constitution_role?: string;
  },
): Promise<Department> {
  if (actor.kind === "user") return upsertUserDepartment(actor.id, input);

  const payload = await loadGuestPayload(actor);
  const slug = input.slug?.trim() || slugify(input.label);
  const existing = payload.departments.find((d) => d.slug === slug);
  const row = {
    slug,
    label: input.label.trim(),
    color: input.color,
    icon: input.icon ?? null,
    mission: input.mission?.trim() || null,
    constitution_role: input.constitution_role ?? inferConstitutionRole(slug),
    sort: existing?.sort ?? payload.departments.length,
    is_active: true,
  };
  payload.departments = [...payload.departments.filter((d) => d.slug !== slug), row];
  await persistGuest(actor, payload);
  const company = await loadCompanyForActor(actor);
  const dept = company.departments.find((d) => d.slug === slug);
  if (!dept) throw new Error("dept_not_found");
  return dept;
}

export async function deactivateDepartmentForActor(actor: OfficeActor, slug: string): Promise<void> {
  if (actor.kind === "user") return deactivateUserDepartment(actor.id, slug);
  const payload = await loadGuestPayload(actor);
  const existing = payload.departments.find((d) => d.slug === slug);
  if (existing) {
    payload.departments = payload.departments.map((d) =>
      d.slug === slug ? { ...d, is_active: false } : d,
    );
  } else {
    payload.departments.push({
      slug,
      label: slug,
      color: "#8b95a1",
      icon: null,
      sort: 999,
      is_active: false,
      mission: null,
      constitution_role: "operator",
    });
  }
  await persistGuest(actor, payload);
}

export async function upsertEmployeeForActor(
  actor: OfficeActor,
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
    workspace_x_pct?: number | null;
    workspace_y_pct?: number | null;
  },
): Promise<Employee> {
  if (actor.kind === "user") return upsertUserEmployee(actor.id, input);

  const payload = await loadGuestPayload(actor);
  const slug = input.slug?.trim() || slugify(input.name);
  if (input.is_leader) {
    payload.employees = payload.employees.map((e) =>
      e.department_slug === input.department_slug ? { ...e, is_leader: false } : e,
    );
  }
  const row: GuestEmpRow = {
    slug,
    department_slug: input.department_slug,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    emoji: input.emoji ?? "🤖",
    vibe: input.vibe?.trim() || null,
    constitution_role: input.constitution_role ?? inferConstitutionRole(input.department_slug),
    constitution_prompt: input.constitution_prompt?.trim() || null,
    is_leader: input.is_leader ?? false,
    seed_employee_id: input.seed_employee_id ?? null,
    sort: payload.employees.filter((e) => e.department_slug === input.department_slug).length,
    is_active: true,
    status: "idle",
    current_task: null,
    workspace_x_pct: input.workspace_x_pct ?? null,
    workspace_y_pct: input.workspace_y_pct ?? null,
  };
  payload.employees = [...payload.employees.filter((e) => e.slug !== slug), row];
  await persistGuest(actor, payload);
  const company = await loadCompanyForActor(actor);
  const emp = company.employees.find((e) => e.slug === slug);
  if (!emp) throw new Error("employee_not_found");
  return emp;
}

export async function saveDeptProfileForActor(
  actor: OfficeActor,
  deptSlug: string,
  realMemberName: string,
): Promise<Department | null> {
  if (actor.kind === "user") {
    const { saveDeptProfile } = await import("@/lib/office/office.server");
    return saveDeptProfile(actor.id, deptSlug, realMemberName);
  }
  const payload = await loadGuestPayload(actor);
  payload.dept_profiles[deptSlug] = realMemberName.trim();
  await persistGuest(actor, payload);
  const company = await loadCompanyForActor(actor);
  return company.departments.find((d) => d.slug === deptSlug) ?? null;
}

export async function runCeoBulkOrderForActor(
  actor: OfficeActor,
  input: {
    message: string;
    target_mode: string;
    target_dept_slugs: string[];
    geminiApiKey?: string | null;
  },
  runChat: (args: {
    message: string;
    deptLabel: string;
    role: string;
    persona: {
      employeeName: string;
      deptMission?: string | null;
      vibe?: string | null;
      constitutionRole?: string;
      constitutionPrompt?: string | null;
    };
  }) => Promise<{ summary: string; body: string }>,
): Promise<CeoOrder> {
  const company = await loadCompanyForActor(actor);
  const targetSlugs = input.target_dept_slugs.length
    ? input.target_dept_slugs
    : company.departments.map((d) => d.slug);

  if (actor.kind === "user") {
    const order = await createCeoOrder(actor.id, {
      message: input.message,
      target_mode: input.target_mode,
      target_dept_slugs: targetSlugs,
    });
    await emitFsmForActor(actor, company, order.id, "CEO_INPUTED", 1, targetSlugs);
    await updateCeoOrderFsm(actor.id, order.id, { fsm_state: "RUNNING", status: "running" });
    await emitFsmForActor(actor, company, order.id, "RUNNING", 2, targetSlugs);

    const { getTeamLeader } = await import("@/lib/office/team-leader-utils");
    for (const deptSlug of targetSlugs) {
      const dept = company.departments.find((d) => d.slug === deptSlug);
      if (!dept) continue;
      const leader = getTeamLeader(deptSlug, company.employees);
      if (!leader) continue;
      try {
        const result = await runChat({
          message: input.message,
          deptLabel: dept.label,
          role: leader.description ?? leader.name,
          persona: {
            employeeName: leader.name,
            deptMission: dept.mission,
            vibe: leader.vibe,
            constitutionRole: leader.constitution_role ?? undefined,
            constitutionPrompt: leader.constitution_prompt,
          },
        });
        await saveCeoOrderResult(order.id, {
          department_slug: dept.slug,
          department_label: dept.label,
          employee_slug: leader.slug,
          employee_name: leader.name,
          summary: result.summary,
          body: result.body,
          status: "done",
          error_message: null,
        });
      } catch (err) {
        await saveCeoOrderResult(order.id, {
          department_slug: dept.slug,
          department_label: dept.label,
          employee_slug: leader.slug,
          employee_name: leader.name,
          summary: null,
          body: null,
          status: "failed",
          error_message: err instanceof Error ? err.message : "unknown",
        });
      }
    }
    await updateCeoOrderFsm(actor.id, order.id, {
      fsm_state: "WAITING_APPROVAL",
      status: "waiting_approval",
    });
    await emitFsmForActor(actor, company, order.id, "WAITING_APPROVAL", 3, targetSlugs);
    const orders = await loadCeoOrders(actor.id);
    return orders.find((o) => o.id === order.id) ?? order;
  }

  const payload = await loadGuestPayload(actor);
  const orderId = randomUUID();
  const results: CeoOrderResult[] = [];
  const { getTeamLeader } = await import("@/lib/office/team-leader-utils");

  await emitFsmForActor(actor, company, orderId, "CEO_INPUTED", 1, targetSlugs);
  await emitFsmForActor(actor, company, orderId, "RUNNING", 2, targetSlugs);

  for (const deptSlug of targetSlugs) {
    const dept = company.departments.find((d) => d.slug === deptSlug);
    if (!dept) continue;
    const leader = getTeamLeader(deptSlug, company.employees);
    if (!leader) continue;
    try {
      const result = await runChat({
        message: input.message,
        deptLabel: dept.label,
        role: leader.description ?? leader.name,
        persona: {
          employeeName: leader.name,
          deptMission: dept.mission,
          vibe: leader.vibe,
          constitutionRole: leader.constitution_role ?? undefined,
          constitutionPrompt: leader.constitution_prompt,
        },
      });
      results.push({
        id: results.length + 1,
        department_slug: dept.slug,
        department_label: dept.label,
        employee_slug: leader.slug,
        employee_name: leader.name,
        summary: result.summary,
        body: result.body,
        status: "done",
        error_message: null,
      });
    } catch (err) {
      results.push({
        id: results.length + 1,
        department_slug: dept.slug,
        department_label: dept.label,
        employee_slug: leader.slug,
        employee_name: leader.name,
        summary: null,
        body: null,
        status: "failed",
        error_message: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  const order: CeoOrder = {
    id: orderId,
    message: input.message,
    target_mode: input.target_mode,
    target_dept_slugs: targetSlugs,
    status: "waiting_approval",
    fsm_state: "WAITING_APPROVAL",
    version: 3,
    created_at: new Date().toISOString(),
    completed_at: null,
    results,
  };
  payload.ceo_orders.unshift(order);
  await emitFsmForActor(actor, company, orderId, "WAITING_APPROVAL", 3, targetSlugs);
  await persistGuest(actor, payload);
  return order;
}

export async function approveCeoOrderForActor(actor: OfficeActor, orderId: string): Promise<CeoOrder> {
  if (actor.kind === "user") {
    const order = await approveCeoOrder(actor.id, orderId);
    const company = await loadMergedCompany(actor.id);
    await emitCeoOrderFsm(actor.id, company, orderId, "COMPLETED", (order.version ?? 1) + 3);
    return (await loadCeoOrders(actor.id)).find((o) => o.id === orderId) ?? order;
  }

  const payload = await loadGuestPayload(actor);
  const order = payload.ceo_orders.find((o) => o.id === orderId);
  if (!order) throw new Error("order_not_found");

  for (const r of order.results ?? []) {
    if (r.status !== "done" || !r.body) continue;
    const id = (payload.reports[0]?.id ?? 0) + 1;
    payload.reports.unshift({
      id,
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
      created_at: new Date().toISOString(),
    });
  }

  order.fsm_state = "COMPLETED";
  order.status = "completed";
  order.completed_at = new Date().toISOString();
  const company = await loadCompanyForActor(actor);
  await emitFsmForActor(actor, company, orderId, "COMPLETED", 4);
  await persistGuest(actor, payload);
  return order;
}

export async function getArtifactUrlForReport(
  actor: OfficeActor,
  reportId: number,
): Promise<string | null> {
  if (actor.kind !== "user") return null;
  const reports = await loadOfficeReports(actor.id);
  const report = reports.find((r) => r.id === reportId);
  if (!report) return null;

  const { getArtifactSignedUrl } = await import("@/lib/office/artifact-storage.server");

  if (report.artifact_path) {
    return getArtifactSignedUrl(report.artifact_path);
  }

  if (report.ceo_order_id) {
    const orders = await loadCeoOrders(actor.id);
    const order = orders.find((o) => o.id === report.ceo_order_id);
    if (order?.artifact_path) return getArtifactSignedUrl(order.artifact_path);
  }

  return null;
}

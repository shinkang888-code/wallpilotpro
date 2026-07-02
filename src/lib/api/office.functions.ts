import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardAgentDeskTrial } from "@/lib/auth/guard-auth.server";
import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { assertChatArtifactGate, assertReportBodyGate } from "@/lib/office/artifact-gate.server";
import { generateDeptReportBody, runOfficeTeamChat } from "@/lib/office/gemini-chat.server";
import { resolveOfficeActor } from "@/lib/office/guest-office.server";
import {
  approveCeoOrderForActor,
  appendEventForActor,
  deactivateDepartmentForActor,
  getArtifactUrlForReport,
  loadCeoOrdersForActor,
  loadCompanyForActor,
  loadEventsForActor,
  loadFsmHistoryForActor,
  loadLatestFsmForActor,
  loadReportsForActor,
  runCeoBulkOrderForActor,
  saveDeptProfileForActor,
  saveReportForActor,
  upsertDepartmentForActor,
  upsertEmployeeForActor,
} from "@/lib/office/office-actor.server";
import { deactivateUserEmployee } from "@/lib/office/office-config.server";
import { checkOfficeSites, patchEmployeeTask } from "@/lib/office/office.server";

const officeContextSchema = z.object({
  accessToken: z.string().nullable().optional(),
  guestId: z.string().uuid().optional(),
});

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

const personaSchema = z.object({
  employeeName: z.string(),
  deptMission: z.string().nullable().optional(),
  vibe: z.string().nullable().optional(),
  constitutionRole: z.string().optional(),
  constitutionPrompt: z.string().nullable().optional(),
});

async function resolveActorCtx(data: {
  accessToken?: string | null;
  guestId?: string;
  geminiApiKey?: string | null;
}) {
  const session = await guardAgentDeskTrial(data.accessToken, {
    geminiApiKey: data.geminiApiKey,
  });
  const actor = resolveOfficeActor({
    userId: session?.user.id,
    guestId: data.guestId,
  });
  return { session, actor };
}

async function requireActor(data: { accessToken?: string | null; guestId?: string }) {
  const { actor } = await resolveActorCtx(data);
  if (!actor) throw new Error("office_actor_required");
  return actor;
}

export const getAgentDeskCompany = createServerFn({ method: "GET" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadCompanyForActor(actor);
  });

export const getAgentDeskEvents = createServerFn({ method: "GET" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadEventsForActor(actor);
  });

export const getAgentDeskReports = createServerFn({ method: "GET" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadReportsForActor(actor);
  });

export const getAgentDeskCeoOrders = createServerFn({ method: "GET" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadCeoOrdersForActor(actor);
  });

export const getAgentDeskLatestFsm = createServerFn({ method: "GET" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadLatestFsmForActor(actor);
  });

export const getAgentDeskFsmHistory = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      orderId: z.string().uuid().optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    return loadFsmHistoryForActor(actor, data.orderId);
  });

export const getAgentDeskArtifactUrl = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      reportId: z.number(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const url = await getArtifactUrlForReport(actor, data.reportId);
    return { url };
  });

export const postAgentDeskChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1),
      deptLabel: z.string(),
      deptSlug: z.string(),
      role: z.string(),
      employeeSlug: z.string().optional(),
      employeeName: z.string().optional(),
      history: z.array(chatTurnSchema).max(20).optional(),
      persona: personaSchema.optional(),
      saveReport: z.boolean().optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    const result = await runOfficeTeamChat({
      message: data.message,
      deptLabel: data.deptLabel,
      role: data.role,
      history: data.history,
      geminiApiKey: data.geminiApiKey,
      persona: data.persona,
    });
    assertChatArtifactGate(result);
    if (actor && data.saveReport !== false) {
      await appendEventForActor(
        actor,
        data.employeeName ?? data.deptLabel,
        `업무 지시: ${data.message.slice(0, 80)}`,
      );
      await saveReportForActor(actor, {
        department_slug: data.deptSlug,
        department_label: data.deptLabel,
        employee_slug: data.employeeSlug ?? null,
        employee_name: data.employeeName ?? null,
        title: `${data.deptLabel} 업무보고`,
        summary: result.summary,
        body: result.body,
        user_prompt: data.message,
        links: result.links,
        source_type: "chat",
        ceo_order_id: null,
        fsm_state: "COMPLETED",
      });
    }
    return result;
  });

export const postAgentDeskDeptReport = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      deptLabel: z.string(),
      deptSlug: z.string(),
      leaderName: z.string(),
      items: z.array(z.string()),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { actor } = await resolveActorCtx(data);
    const body = await generateDeptReportBody(data);
    assertReportBodyGate(body);
    if (actor) {
      await saveReportForActor(actor, {
        department_slug: data.deptSlug,
        department_label: data.deptLabel,
        employee_slug: null,
        employee_name: data.leaderName,
        title: `${data.deptLabel} 정기 보고`,
        summary: null,
        body,
        user_prompt: data.items.join("\n"),
        links: [],
        source_type: "dept_report",
        ceo_order_id: null,
        fsm_state: "COMPLETED",
      });
    }
    return { body };
  });

export const patchAgentDeskDeptProfile = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      deptSlug: z.string(),
      realMemberName: z.string(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const dept = await saveDeptProfileForActor(actor, data.deptSlug, data.realMemberName);
    return { dept };
  });

export const postAgentDeskUpsertDepartment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().optional(),
      label: z.string().min(1),
      color: z.string(),
      icon: z.string().nullable().optional(),
      mission: z.string().nullable().optional(),
      constitution_role: z.string().optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const dept = await upsertDepartmentForActor(actor, data);
    await appendEventForActor(actor, "조직", `부서 '${dept.label}' 저장`);
    return { dept };
  });

export const postAgentDeskDeleteDepartment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    await deactivateDepartmentForActor(actor, data.slug);
    await appendEventForActor(actor, "조직", `부서 '${data.slug}' 비활성화`);
    return { ok: true };
  });

export const postAgentDeskUpsertEmployee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string().optional(),
      department_slug: z.string(),
      name: z.string().min(1),
      description: z.string().nullable().optional(),
      emoji: z.string().nullable().optional(),
      vibe: z.string().nullable().optional(),
      constitution_role: z.string().optional(),
      constitution_prompt: z.string().nullable().optional(),
      is_leader: z.boolean().optional(),
      seed_employee_id: z.number().nullable().optional(),
      workspace_x_pct: z.number().nullable().optional(),
      workspace_y_pct: z.number().nullable().optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const employee = await upsertEmployeeForActor(actor, data);
    await appendEventForActor(actor, "인사", `직원 '${employee.name}' 배치`);
    return { employee };
  });

export const postAgentDeskDeleteEmployee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    if (actor.kind === "user") {
      await deactivateUserEmployee(actor.id, data.slug);
    } else {
      const payload = await import("@/lib/office/guest-office.server").then((m) =>
        m.loadGuestWorkspace(actor.id),
      );
      payload.employees = payload.employees.map((e) =>
        e.slug === data.slug ? { ...e, is_active: false } : e,
      );
      const { saveGuestWorkspace } = await import("@/lib/office/guest-office.server");
      await saveGuestWorkspace(actor.id, payload);
    }
    await appendEventForActor(actor, "인사", `직원 '${data.slug}' 비활성화`);
    return { ok: true };
  });

export const postAgentDeskCeoBulkOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1),
      target_mode: z.enum(["all", "selected"]),
      target_dept_slugs: z.array(z.string()).optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const company = await loadCompanyForActor(actor);
    const targetSlugs =
      data.target_mode === "selected" && data.target_dept_slugs?.length
        ? data.target_dept_slugs
        : company.departments.map((d) => d.slug);

    const order = await runCeoBulkOrderForActor(
      actor,
      {
        message: data.message,
        target_mode: data.target_mode,
        target_dept_slugs: targetSlugs,
        geminiApiKey: data.geminiApiKey,
      },
      async (args) => {
        const result = await runOfficeTeamChat({
          message: data.message,
          deptLabel: args.deptLabel,
          role: args.role,
          geminiApiKey: data.geminiApiKey,
          persona: args.persona,
        });
        assertChatArtifactGate(result);
        return result;
      },
    );
    await appendEventForActor(actor, "CEO", `일괄 지시: ${data.message.slice(0, 60)}`);
    return order;
  });

export const postAgentDeskApproveCeoOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    const order = await approveCeoOrderForActor(actor, data.orderId);
    await appendEventForActor(actor, "CEO", `일괄 지시 승인·보관 (${order.id.slice(0, 8)})`);
    return { order };
  });

export const patchAgentDeskEmployee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      employeeId: z.number(),
      status: z.enum(["working", "meeting", "review", "idle", "error"]).optional(),
      current_task: z.string().nullable().optional(),
      accessToken: z.string().nullable().optional(),
      guestId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    if (actor.kind !== "user") throw new Error("auth_required");
    const employee = await patchEmployeeTask(actor.id, data.employeeId, {
      status: data.status,
      current_task: data.current_task ?? undefined,
    });
    return { employee };
  });

export const runAgentDeskSiteCheck = createServerFn({ method: "POST" })
  .inputValidator(officeContextSchema)
  .handler(async ({ data }) => {
    const actor = await requireActor(data);
    if (actor.kind !== "user") throw new Error("auth_required");
    const sites = await checkOfficeSites(actor.id);
    return { sites };
  });

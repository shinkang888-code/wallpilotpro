import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardAgentDeskTrial } from "@/lib/auth/guard-auth.server";
import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { generateDeptReportBody, runOfficeTeamChat } from "@/lib/office/gemini-chat.server";
import {
  approveCeoOrder,
  createCeoOrder,
  deactivateUserDepartment,
  deactivateUserEmployee,
  emitCeoOrderFsm,
  loadCeoOrders,
  loadOfficeReports,
  saveCeoOrderResult,
  saveOfficeReport,
  updateCeoOrderFsm,
  upsertUserDepartment,
  upsertUserEmployee,
} from "@/lib/office/office-config.server";
import { loadLatestFsmSnapshot, loadFsmSnapshots } from "@/lib/office/office-fsm.server";
import {
  appendOfficeEvent,
  checkOfficeSites,
  loadOfficeCompany,
  loadOfficeEvents,
  patchEmployeeTask,
  saveDeptProfile,
} from "@/lib/office/office.server";
import { getTeamLeader } from "@/lib/office/team-leader-utils";

const tokenSchema = z.object({
  accessToken: z.string().nullable().optional(),
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

export const getAgentDeskCompany = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    return loadOfficeCompany(session?.user.id ?? null);
  });

export const getAgentDeskEvents = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    return loadOfficeEvents(session?.user.id ?? null);
  });

export const getAgentDeskReports = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return [];
    return loadOfficeReports(session.user.id);
  });

export const getAgentDeskCeoOrders = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return [];
    return loadCeoOrders(session.user.id);
  });

export const getAgentDeskLatestFsm = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return null;
    return loadLatestFsmSnapshot(session.user.id);
  });

export const getAgentDeskFsmHistory = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      orderId: z.string().uuid().optional(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return [];
    return loadFsmSnapshots(session.user.id, { orderId: data.orderId, limit: 50 });
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
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken, {
      geminiApiKey: data.geminiApiKey,
    });
    const result = await runOfficeTeamChat({
      message: data.message,
      deptLabel: data.deptLabel,
      role: data.role,
      history: data.history,
      geminiApiKey: data.geminiApiKey,
      persona: data.persona,
    });
    if (session?.user.id) {
      await appendOfficeEvent(
        session.user.id,
        data.employeeName ?? data.deptLabel,
        `업무 지시: ${data.message.slice(0, 80)}`,
      );
      if (data.saveReport !== false && result.body) {
        await saveOfficeReport(session.user.id, {
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
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    const body = await generateDeptReportBody(data);
    if (session?.user.id) {
      await saveOfficeReport(session.user.id, {
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
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const dept = await saveDeptProfile(session.user.id, data.deptSlug, data.realMemberName);
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
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const dept = await upsertUserDepartment(session.user.id, data);
    await appendOfficeEvent(session.user.id, "조직", `부서 '${dept.label}' 저장`);
    return { dept };
  });

export const postAgentDeskDeleteDepartment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    await deactivateUserDepartment(session.user.id, data.slug);
    await appendOfficeEvent(session.user.id, "조직", `부서 '${data.slug}' 비활성화`);
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
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const employee = await upsertUserEmployee(session.user.id, data);
    await appendOfficeEvent(session.user.id, "인사", `직원 '${employee.name}' 배치`);
    return { employee };
  });

export const postAgentDeskDeleteEmployee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      slug: z.string(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    await deactivateUserEmployee(session.user.id, data.slug);
    await appendOfficeEvent(session.user.id, "인사", `직원 '${data.slug}' 비활성화`);
    return { ok: true };
  });

export const postAgentDeskCeoBulkOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1),
      target_mode: z.enum(["all", "selected"]),
      target_dept_slugs: z.array(z.string()).optional(),
      accessToken: z.string().nullable().optional(),
      ...clientGeminiKeySchema.shape,
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken, {
      geminiApiKey: data.geminiApiKey,
    });
    if (!session?.user.id) throw new Error("auth_required");

    const company = await loadOfficeCompany(session.user.id);
    const targetSlugs =
      data.target_mode === "selected" && data.target_dept_slugs?.length
        ? data.target_dept_slugs
        : company.departments.map((d) => d.slug);

    const order = await createCeoOrder(session.user.id, {
      message: data.message,
      target_mode: data.target_mode,
      target_dept_slugs: targetSlugs,
    });

    await emitCeoOrderFsm(session.user.id, company, order.id, "CEO_INPUTED", 1, targetSlugs);

    await updateCeoOrderFsm(session.user.id, order.id, {
      fsm_state: "RUNNING",
      status: "running",
    });
    await emitCeoOrderFsm(session.user.id, company, order.id, "RUNNING", 2, targetSlugs);
    await appendOfficeEvent(session.user.id, "CEO", `일괄 지시: ${data.message.slice(0, 60)}`);

    for (const deptSlug of targetSlugs) {
      const dept = company.departments.find((d) => d.slug === deptSlug);
      if (!dept) continue;
      const leader = getTeamLeader(deptSlug, company.employees);
      if (!leader) continue;

      try {
        const result = await runOfficeTeamChat({
          message: data.message,
          deptLabel: dept.label,
          role: leader.description ?? leader.name,
          geminiApiKey: data.geminiApiKey,
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

    await updateCeoOrderFsm(session.user.id, order.id, {
      fsm_state: "WAITING_APPROVAL",
      status: "waiting_approval",
    });
    await emitCeoOrderFsm(session.user.id, company, order.id, "WAITING_APPROVAL", 3, targetSlugs);

    const orders = await loadCeoOrders(session.user.id, 5);
    return orders.find((o) => o.id === order.id) ?? order;
  });

export const postAgentDeskApproveCeoOrder = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      orderId: z.string().uuid(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const order = await approveCeoOrder(session.user.id, data.orderId);
    await appendOfficeEvent(session.user.id, "CEO", `일괄 지시 승인·보관 (${order.id.slice(0, 8)})`);
    return { order };
  });

export const patchAgentDeskEmployee = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      employeeId: z.number(),
      status: z.enum(["working", "meeting", "review", "idle", "error"]).optional(),
      current_task: z.string().nullable().optional(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const employee = await patchEmployeeTask(session.user.id, data.employeeId, {
      status: data.status,
      current_task: data.current_task ?? undefined,
    });
    return { employee };
  });

export const runAgentDeskSiteCheck = createServerFn({ method: "POST" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const sites = await checkOfficeSites(session.user.id);
    return { sites };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardAgentDeskTrial } from "@/lib/auth/guard-auth.server";
import { clientGeminiKeySchema } from "@/lib/api/client-gemini-key";
import { generateDeptReportBody, runOfficeTeamChat } from "@/lib/office/gemini-chat.server";
import {
  appendOfficeEvent,
  checkOfficeSites,
  loadOfficeCompany,
  loadOfficeEvents,
  patchEmployeeTask,
  saveDeptProfile,
} from "@/lib/office/office.server";

const tokenSchema = z.object({
  accessToken: z.string().nullable().optional(),
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

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
});

export const postAgentDeskChat = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      message: z.string().min(1),
      deptLabel: z.string(),
      role: z.string(),
      history: z.array(chatTurnSchema).max(20).optional(),
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
    });
    if (session?.user.id) {
      await appendOfficeEvent(session.user.id, data.deptLabel, `업무 지시: ${data.message.slice(0, 80)}`);
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
    await guardAgentDeskTrial(data.accessToken);
    const body = await generateDeptReportBody(data);
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

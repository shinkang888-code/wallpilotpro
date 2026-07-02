import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardAgentDeskTrial } from "@/lib/auth/guard-auth.server";
import {
  createAniProject,
  deleteAniProject,
  listAniProjects,
  listDeptBindings,
  updateAniProjectEmoji,
} from "@/lib/anistudio/storage.server";

const tokenSchema = z.object({ accessToken: z.string().nullable().optional() });

export const getAniStudioBindings = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return { bindings: [] };
    const bindings = await listDeptBindings(session.user.id);
    return { bindings };
  });

export const getAniStudioProjects = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) return { projects: [] };
    const projects = await listAniProjects(session.user.id);
    return { projects };
  });

export const createAniStudioProject = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      departmentSlug: z.string().optional(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    const project = await createAniProject(session.user.id, data.name, data.departmentSlug);
    return { project };
  });

export const deleteAniStudioProject = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.string(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    await deleteAniProject(session.user.id, data.projectId);
    return { ok: true };
  });

export const patchAniStudioEmoji = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      projectId: z.string(),
      emoji: z.string(),
      accessToken: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const session = await guardAgentDeskTrial(data.accessToken);
    if (!session?.user.id) throw new Error("auth_required");
    await updateAniProjectEmoji(session.user.id, data.projectId, data.emoji);
    return { ok: true };
  });

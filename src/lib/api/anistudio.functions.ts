import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { guardFeature } from "@/lib/auth/guard-auth.server";
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
    const session = await guardFeature(data.accessToken, "agent_desk");
    if (!session?.userId) return { bindings: [] };
    const bindings = await listDeptBindings(session.userId);
    return { bindings };
  });

export const getAniStudioProjects = createServerFn({ method: "GET" })
  .inputValidator(tokenSchema)
  .handler(async ({ data }) => {
    const session = await guardFeature(data.accessToken, "agent_desk");
    if (!session?.userId) return { projects: [] };
    const projects = await listAniProjects(session.userId);
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
    const session = await guardFeature(data.accessToken, "agent_desk");
    if (!session?.userId) throw new Error("auth_required");
    const project = await createAniProject(session.userId, data.name, data.departmentSlug);
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
    const session = await guardFeature(data.accessToken, "agent_desk");
    if (!session?.userId) throw new Error("auth_required");
    await deleteAniProject(session.userId, data.projectId);
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
    const session = await guardFeature(data.accessToken, "agent_desk");
    if (!session?.userId) throw new Error("auth_required");
    await updateAniProjectEmoji(session.userId, data.projectId, data.emoji);
    return { ok: true };
  });

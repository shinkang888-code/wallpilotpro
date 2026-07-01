import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import { exportBuildingBinding } from "@/lib/anistudio/export-formats";
import type { BuildingRouteBinding } from "@/lib/anistudio/building-binding";
import { createDefaultProject, projectSummary } from "@/lib/anistudio/defaults";
import type { AniProject, AniProjectSummary } from "@/lib/anistudio/types";

type Row = {
  id: string;
  name: string;
  department_slug: string | null;
  data: AniProject;
  created_at: string;
  updated_at: string;
};

function rowToProject(row: Row): AniProject {
  return { ...row.data, id: row.id, name: row.name, departmentSlug: row.department_slug ?? undefined };
}

export async function listAniProjects(userId: string): Promise<AniProjectSummary[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("anistudio_projects")
    .select("id, name, department_slug, data, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return (data as Row[] | null)?.map((r) =>
    projectSummary(rowToProject(r)),
  ) ?? [];
}

export async function listDeptBindings(userId: string): Promise<BuildingRouteBinding[]> {
  if (!isSupabaseConfigured()) return [];
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("anistudio_projects")
    .select("id, name, department_slug, data")
    .eq("user_id", userId)
    .not("department_slug", "is", null);

  const bindings: BuildingRouteBinding[] = [];
  for (const row of (data as Row[] | null) ?? []) {
    const project = rowToProject(row);
    if (!project.departmentSlug) continue;
    const binding = exportBuildingBinding(project);
    bindings.push({
      ...binding,
      departmentSlug: project.departmentSlug,
      projectId: project.id,
      projectName: project.name,
    } as BuildingRouteBinding);
  }
  return bindings;
}

export async function createAniProject(
  userId: string,
  name: string,
  departmentSlug?: string,
): Promise<AniProject> {
  const project = createDefaultProject(name, departmentSlug);

  if (isSupabaseConfigured()) {
    const admin = getSupabaseAdmin();
    if (admin) {
      if (departmentSlug) {
        await admin
          .from("anistudio_projects")
          .delete()
          .eq("user_id", userId)
          .eq("department_slug", departmentSlug);
      }
      await admin.from("anistudio_projects").insert({
        id: project.id,
        user_id: userId,
        name: project.name,
        department_slug: departmentSlug ?? null,
        data: project,
        updated_at: project.updatedAt,
      });
    }
  }

  return project;
}

export async function deleteAniProject(userId: string, projectId: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;
  await admin.from("anistudio_projects").delete().eq("user_id", userId).eq("id", projectId);
}

export async function updateAniProjectEmoji(
  userId: string,
  projectId: string,
  emoji: string,
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  const { data } = await admin
    .from("anistudio_projects")
    .select("data")
    .eq("user_id", userId)
    .eq("id", projectId)
    .maybeSingle();

  if (!data?.data) return;
  const project = data.data as AniProject;
  project.character.spriteUrl = emoji;
  project.updatedAt = new Date().toISOString();

  await admin
    .from("anistudio_projects")
    .update({ data: project, updated_at: project.updatedAt })
    .eq("user_id", userId)
    .eq("id", projectId);
}

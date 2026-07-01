import type { AniProject } from "@/lib/anistudio/types";

export function isRigRender(project: AniProject): boolean {
  return project.character.renderMode === "rig";
}

export function exportBuildingBinding(project: AniProject) {
  const { width, height } = project.canvas;
  const hasRigParts =
    isRigRender(project) &&
    project.rig.parts.some((p) => p.imageUrl && p.visible !== false);

  return {
    departmentSlug: project.departmentSlug,
    projectId: project.id,
    projectName: project.name,
    startPercent: {
      x: (project.character.startPosition.x / width) * 100,
      y: (project.character.startPosition.y / height) * 100,
    },
    routePercent: project.route.points.map((p) => ({
      x: (p.x / width) * 100,
      y: (p.y / height) * 100,
    })),
    mode: project.route.mode,
    loop: project.route.loop,
    durationMs: project.route.durationMs,
    scale: project.character.scale,
    spriteUrl: project.character.spriteUrl,
    closed: project.route.closed ?? false,
    renderMode: project.character.renderMode ?? "paper-doll",
    flipOnTurn: project.character.flipOnTurn ?? true,
    spriteWidth: project.character.spriteWidth,
    spriteHeight: project.character.spriteHeight,
    ...(hasRigParts
      ? {
          rig: {
            bones: project.rig.bones,
            parts: project.rig.parts.filter((p) => p.visible !== false),
            keyframes: project.rig.keyframes,
            anchorPx: { ...project.character.startPosition },
          },
        }
      : {}),
  };
}

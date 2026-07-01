import type { AniProject, AniProjectSummary, RoutePoint } from "@/lib/anistudio/types";

const EMOJI_SPRITES = ["🧑‍💼", "👩‍💻", "🧑‍🔬", "👨‍💼", "🤖", "🦸", "🧙", "👩‍🚀"];

function rid() {
  return crypto.randomUUID().slice(0, 8);
}

export function createDefaultProject(
  name: string,
  departmentSlug?: string,
  emojiIndex = 0,
): AniProject {
  const now = new Date().toISOString();
  const start = { x: 180, y: 380 };
  const loopPoints: RoutePoint[] = [
    { id: rid(), x: start.x, y: start.y },
    { id: rid(), x: start.x + 280, y: start.y },
    { id: rid(), x: start.x + 280, y: start.y - 60 },
    { id: rid(), x: start.x, y: start.y - 60 },
  ];

  return {
    id: rid(),
    name,
    departmentSlug,
    createdAt: now,
    updatedAt: now,
    canvas: { width: 960, height: 600 },
    character: {
      spriteUrl: EMOJI_SPRITES[emojiIndex % EMOJI_SPRITES.length],
      startPosition: start,
      scale: 1,
      renderMode: "paper-doll",
      flipOnTurn: true,
    },
    route: {
      mode: "free",
      loop: "repeat",
      durationMs: 8000,
      closed: true,
      points: loopPoints,
    },
    rig: { bones: [], parts: [], keyframes: [] },
  };
}

export function projectSummary(p: AniProject): AniProjectSummary {
  return {
    id: p.id,
    name: p.name,
    departmentSlug: p.departmentSlug,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export { EMOJI_SPRITES };

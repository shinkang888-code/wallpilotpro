import type { BoneDef, RigKeyframe, RigPart } from "@/lib/anistudio/types";

export type BuildingRouteBinding = {
  departmentSlug: string;
  projectId: string;
  projectName: string;
  startPercent: { x: number; y: number };
  routePercent: { x: number; y: number }[];
  mode: "straight" | "free";
  loop: "once" | "repeat" | "pingpong";
  durationMs: number;
  scale: number;
  spriteUrl: string;
  closed?: boolean;
  renderMode?: "paper-doll" | "rig";
  flipOnTurn?: boolean;
  spriteWidth?: number;
  spriteHeight?: number;
  rig?: {
    bones: BoneDef[];
    parts: RigPart[];
    keyframes: RigKeyframe[];
    anchorPx: { x: number; y: number };
  };
};

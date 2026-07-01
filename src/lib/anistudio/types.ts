export type MoveMode = "straight" | "free";
export type LoopMode = "once" | "repeat" | "pingpong";
export type RenderMode = "paper-doll" | "rig";

export type RoutePoint = { id: string; x: number; y: number };

export type BoneDef = {
  id: string;
  name: string;
  label: string;
  parentId: string | null;
  x: number;
  y: number;
  rotation: number;
  length: number;
};

export type RigPart = {
  id: string;
  boneId: string;
  name: string;
  imageUrl: string;
  width: number;
  height: number;
  pivotX: number;
  pivotY: number;
  offsetX: number;
  offsetY: number;
  zIndex?: number;
  visible?: boolean;
};

export type RigKeyframe = {
  id: string;
  timeMs: number;
  label: string;
  poses: Record<string, { rotation: number; x?: number; y?: number }>;
};

export type AniProject = {
  id: string;
  name: string;
  description?: string;
  departmentSlug?: string;
  createdAt: string;
  updatedAt: string;
  canvas: { width: number; height: number; backgroundUrl?: string };
  character: {
    spriteUrl: string;
    startPosition: { x: number; y: number };
    scale: number;
    renderMode?: RenderMode;
    flipOnTurn?: boolean;
    spriteWidth?: number;
    spriteHeight?: number;
  };
  route: {
    mode: MoveMode;
    points: RoutePoint[];
    loop: LoopMode;
    durationMs: number;
    closed?: boolean;
  };
  rig: {
    bones: BoneDef[];
    parts: RigPart[];
    keyframes: RigKeyframe[];
  };
};

export type AniProjectSummary = Pick<
  AniProject,
  "id" | "name" | "departmentSlug" | "createdAt" | "updatedAt"
>;

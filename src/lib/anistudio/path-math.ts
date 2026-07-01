import type { LoopMode, MoveMode, RoutePoint } from "@/lib/anistudio/types";

type Point = { x: number; y: number };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPt(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function effectivePoints(points: RoutePoint[], closed: boolean): RoutePoint[] {
  if (!closed || points.length < 3) return points;
  return [...points, { ...points[0], id: "__close__" }];
}

export function sampleRoute(
  points: RoutePoint[],
  mode: MoveMode,
  t: number,
  closed = false,
): Point {
  const pts = effectivePoints(points, closed);
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };

  const segs = pts.length - 1;
  const raw = t * segs;
  const seg = Math.min(Math.floor(raw), segs - 1);
  const local = raw - seg;
  const a = pts[seg];
  const b = pts[seg + 1];

  if (mode === "straight") return lerpPt(a, b, local);

  const p0 = pts[Math.max(0, seg - 1)];
  const p1 = a;
  const p2 = b;
  const p3 = pts[Math.min(pts.length - 1, seg + 2)];
  const t2 = local;
  const t3 = t2 * t2;
  const t4 = t3 * t2;

  return {
    x:
      0.5 *
      (2 * p1.x +
        (-p0.x + p2.x) * t2 +
        (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t3 +
        (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t4),
    y:
      0.5 *
      (2 * p1.y +
        (-p0.y + p2.y) * t2 +
        (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t3 +
        (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t4),
  };
}

export function loopT(t: number, loop: LoopMode): number {
  if (loop === "once") return Math.min(1, Math.max(0, t));
  if (loop === "repeat") return t - Math.floor(t);
  const cycle = t % 2;
  return cycle <= 1 ? cycle : 2 - cycle;
}

export function facingAngle(from: Point, to: Point): number {
  return (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
}

import { useEffect, useState } from "react";

import type { BuildingRouteBinding } from "@/lib/anistudio/building-binding";
import { facingAngle, loopT, sampleRoute } from "@/lib/anistudio/path-math";
import type { RoutePoint } from "@/lib/anistudio/types";

export function useRoutePosition(binding: BuildingRouteBinding | undefined) {
  const [pos, setPos] = useState({ x: 0, y: 0, rot: 0, flipX: 1 });

  useEffect(() => {
    if (!binding || binding.routePercent.length < 2) {
      if (binding) {
        setPos({ x: binding.startPercent.x, y: binding.startPercent.y, rot: 0, flipX: 1 });
      }
      return;
    }

    const paperDoll = binding.renderMode !== "rig";
    const points: RoutePoint[] = binding.routePercent.map((p, i) => ({
      id: String(i),
      x: p.x,
      y: p.y,
    }));
    const closed = binding.closed ?? false;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      const t = loopT((now - t0) / binding.durationMs, binding.loop);
      const p = sampleRoute(points, binding.mode, t, closed);
      const next = sampleRoute(points, binding.mode, Math.min(1, t + 0.002), closed);
      if (paperDoll) {
        const flip = binding.flipOnTurn !== false && next.x < p.x ? -1 : 1;
        setPos({ x: p.x, y: p.y, rot: 0, flipX: flip });
      } else {
        setPos({ x: p.x, y: p.y, rot: facingAngle(p, next), flipX: 1 });
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [binding]);

  return pos;
}

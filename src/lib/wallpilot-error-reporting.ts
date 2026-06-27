/** Client-side error capture hook (optional third-party bridge). */
export function reportWallPilotError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  console.error("[WallPilot]", error, context);
}

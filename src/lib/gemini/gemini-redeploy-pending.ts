const STORAGE_KEY = "wallpilot.gemini.redeploy-pending";
const TTL_MS = 3 * 60 * 1000;

export function markGeminiRedeployPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

export function clearGeminiRedeployPending(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readGeminiRedeployPending(): { pending: boolean; startedAt: number | null } {
  if (typeof window === "undefined") return { pending: false, startedAt: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { pending: false, startedAt: null };
    const startedAt = Number(raw);
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > TTL_MS) {
      clearGeminiRedeployPending();
      return { pending: false, startedAt: null };
    }
    return { pending: true, startedAt };
  } catch {
    return { pending: false, startedAt: null };
  }
}

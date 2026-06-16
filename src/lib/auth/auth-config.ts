/** Runtime Supabase config (filled from server when VITE_* not baked at build). */
let runtime: { url: string; anonKey: string } | null = null;

export function setRuntimeSupabaseConfig(url: string, anonKey: string) {
  runtime = { url, anonKey };
}

export function clearRuntimeSupabaseConfig() {
  runtime = null;
}

/** Public Supabase config (safe for browser). */
export function getPublicSupabaseConfig() {
  const url =
    (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? runtime?.url ?? "";
  const anonKey =
    (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? runtime?.anonKey ?? "";
  return {
    url,
    anonKey,
    isConfigured: Boolean(url && anonKey),
  };
}

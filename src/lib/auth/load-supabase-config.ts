import { getPublicAuthConfig } from "@/lib/api/auth.functions";
import {
  getPublicSupabaseConfig,
  setRuntimeSupabaseConfig,
} from "@/lib/auth/auth-config";
import { resetSupabaseBrowserClient } from "@/lib/auth/supabase-browser";

/** Load Supabase browser config from VITE_* or server fallback. */
export async function ensureClientSupabaseConfig(): Promise<boolean> {
  if (getPublicSupabaseConfig().isConfigured) return true;

  try {
    const cfg = await getPublicAuthConfig({ data: {} });
    if (cfg.isConfigured && cfg.url && cfg.anonKey) {
      setRuntimeSupabaseConfig(cfg.url, cfg.anonKey);
      resetSupabaseBrowserClient();
      return true;
    }
  } catch {
    /* server unreachable */
  }
  return false;
}

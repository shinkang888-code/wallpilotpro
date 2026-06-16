import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicSupabaseConfig } from "@/lib/auth/auth-config";

let browserClient: SupabaseClient | null = null;
let clientKey = "";

export function resetSupabaseBrowserClient() {
  browserClient = null;
  clientKey = "";
}

export function getSupabaseBrowser(): SupabaseClient | null {
  const { url, anonKey, isConfigured } = getPublicSupabaseConfig();
  if (!isConfigured) return null;

  const cacheKey = `${url}:${anonKey.slice(0, 12)}`;
  if (browserClient && clientKey === cacheKey) return browserClient;

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Callback route calls exchangeCodeForSession explicitly; avoid double-handling.
      detectSessionInUrl: false,
      flowType: "pkce",
    },
  });
  clientKey = cacheKey;
  return browserClient;
}

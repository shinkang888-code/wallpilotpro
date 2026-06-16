import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerConfig } from "@/lib/config.server";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerConfig();
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;
  if (!client) {
    client = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export function isSupabaseAdminConfigured(): boolean {
  const { supabaseUrl, supabaseServiceRoleKey } = getServerConfig();
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

/** @deprecated Use isSupabaseAdminConfigured — server profile/session needs service role. */
export function isSupabaseConfigured(): boolean {
  return isSupabaseAdminConfigured();
}

export function isSupabaseBrowserConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getServerConfig();
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function resetSupabaseClient() {
  client = null;
}

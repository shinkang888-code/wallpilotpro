import { getServerConfig } from "@/lib/config.server";
import { isAuthEnforced } from "@/lib/auth/entitlements.server";
import { isGoogleAuthConfigured } from "@/lib/api/google-auth-connect.server";
import {
  isSupabaseAdminConfigured,
  isSupabaseBrowserConfigured,
} from "@/lib/db/supabase.server";

export type AuthDiagnostics = {
  enforced: boolean;
  supabaseConfigured: boolean;
  supabaseBrowserConfigured: boolean;
  hasServiceRoleKey: boolean;
  hasAnonKey: boolean;
  autoApprove: boolean;
  googleEnvConfigured: boolean;
  projectRef: string | null;
  supabaseGoogleCallbackUrl: string | null;
  appCallbackUrl: string;
  siteUrl: string;
  bootstrapAdminEmail: string | null;
};

export function getAuthDiagnostics(): AuthDiagnostics {
  const cfg = getServerConfig();
  const projectRef = cfg.supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/i)?.[1] ?? null;
  const siteUrl = cfg.authSiteUrl.replace(/\/$/, "");
  const appCallbackUrl = `${siteUrl}/auth/callback`;

  return {
    enforced: isAuthEnforced(),
    supabaseConfigured: isSupabaseAdminConfigured(),
    supabaseBrowserConfigured: isSupabaseBrowserConfigured(),
    hasServiceRoleKey: Boolean(cfg.supabaseServiceRoleKey),
    hasAnonKey: Boolean(cfg.supabaseAnonKey),
    autoApprove: cfg.authAutoApprove !== "false",
    googleEnvConfigured: isGoogleAuthConfigured(),
    projectRef,
    supabaseGoogleCallbackUrl: projectRef
      ? `https://${projectRef}.supabase.co/auth/v1/callback`
      : null,
    appCallbackUrl,
    siteUrl,
    bootstrapAdminEmail: cfg.bootstrapAdminEmail || null,
  };
}

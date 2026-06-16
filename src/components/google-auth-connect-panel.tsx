import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import { getGoogleAuthStatus, testGoogleAuthCredentials, connectGoogleAuth } from "@/lib/api/google-auth-connect.functions";
import { getPublicAuthConfig } from "@/lib/api/auth.functions";
import { useI18n } from "@/lib/i18n";
import { useVercelCredentials } from "@/lib/use-vercel-credentials";
import { cn } from "@/lib/utils";

function GoogleGIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

export function GoogleAuthConnectPanel() {
  const { t } = useI18n();
  const vercel = useVercelCredentials();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [redirectUri, setRedirectUri] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [revealSecret, setRevealSecret] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    canSyncToVercel: boolean;
    vercelProjectId: string | null;
    redirectUri: string | null;
  } | null>(null);
  const [authUrls, setAuthUrls] = useState<{
    supabaseGoogleCallbackUrl: string | null;
    appCallbackUrl: string;
  } | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const [s, pub] = await Promise.all([
        getGoogleAuthStatus({ data: vercel.overrides ?? {} }),
        getPublicAuthConfig({ data: {} }),
      ]);
      setStatus(s);
      setAuthUrls({
        supabaseGoogleCallbackUrl: pub.diagnostics?.supabaseGoogleCallbackUrl ?? null,
        appCallbackUrl: pub.diagnostics?.appCallbackUrl ?? "",
      });
      if (s.redirectUri) {
        setRedirectUri((prev) => prev || s.redirectUri!);
      } else if (pub.diagnostics?.appCallbackUrl) {
        setRedirectUri((prev) => prev || pub.diagnostics.appCallbackUrl);
      }
    } catch {
      setStatus(null);
    }
  }, [vercel.overrides]);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  const isConnected = status?.configured ?? false;
  const canSyncToVercel = status?.canSyncToVercel ?? vercel.hasLocalCreds;

  const messageFor = (code: string) => {
    const map: Record<string, string> = {
      invalid_google_client_id: t("gauth_err_client_id"),
      invalid_google_client_secret: t("gauth_err_client_secret"),
      invalid_redirect_uri: t("gauth_err_redirect"),
      vercel_not_configured: t("sb_err_vercel"),
      setup_secret_required: t("sb_err_secret"),
      verified: t("gauth_test_ok"),
      saved: t("gauth_save_ok"),
      saved_and_redeploying: t("gauth_save_redeploy"),
    };
    return map[code] ?? code;
  };

  const payload = () => ({
    clientId: clientId.trim(),
    clientSecret: clientSecret.trim(),
    redirectUri: redirectUri.trim() || undefined,
  });

  const handleTest = async () => {
    const p = payload();
    if (!p.clientId || !p.clientSecret) return;
    setTesting(true);
    try {
      const res = await testGoogleAuthCredentials({ data: p });
      if (res.ok) toast.success(messageFor(res.message));
      else toast.error(messageFor(res.message));
    } catch {
      toast.error(t("gauth_err_unreachable"));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    const p = payload();
    if (!p.clientId || !p.clientSecret) return;
    setLoading(true);
    try {
      const res = await connectGoogleAuth({
        data: {
          ...p,
          setupSecret: setupSecret.trim() || undefined,
          triggerRedeploy: true,
          ...vercel.overrides,
        },
      });
      if (res.ok) {
        toast.success(messageFor(res.message));
        setClientSecret("");
        await refreshStatus();
      } else {
        toast.error(messageFor(res.message));
      }
    } catch {
      toast.error(t("gauth_err_unreachable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white",
            isConnected && "ring-2 ring-positive/30",
          )}
        >
          {isConnected ? (
            <ShieldCheck className="h-5 w-5 text-positive" />
          ) : (
            <GoogleGIcon className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
            {t("gauth_panel_title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("gauth_panel_subtitle")}
          </p>
          {status && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isConnected ? t("gauth_connected") : t("gauth_disconnected")}
              {status.vercelProjectId && (
                <span className="ml-2 font-mono normal-case tracking-normal">
                  · {status.vercelProjectId.slice(0, 8)}…
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {!canSyncToVercel && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("sb_vercel_hint")}
        </p>
      )}

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("gauth_client_id_label")}
          </label>
          <input
            type="text"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            placeholder="123456789-xxxx.apps.googleusercontent.com"
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("gauth_client_secret_label")}
          </label>
          <div className="relative mt-1.5">
            <input
              type={revealSecret ? "text" : "password"}
              value={clientSecret}
              onChange={(e) => setClientSecret(e.target.value)}
              placeholder="GOCSPX-…"
              className="w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={() => setRevealSecret((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
              aria-label="toggle reveal"
            >
              {revealSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("gauth_redirect_label")}
          </label>
          <input
            type="url"
            value={redirectUri}
            onChange={(e) => setRedirectUri(e.target.value)}
            placeholder="https://wallpilot.vercel.app/auth/callback/google"
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <p className="mt-1.5 text-[10px] text-muted-foreground">{t("gauth_redirect_hint")}</p>
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("sb_secret_label")}
          </label>
          <input
            type="password"
            value={setupSecret}
            onChange={(e) => setSetupSecret(e.target.value)}
            placeholder={t("sb_secret_placeholder")}
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={handleTest}
          disabled={testing || !clientId.trim() || !clientSecret.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("sb_test")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={
            loading || !canSyncToVercel || !clientId.trim() || !clientSecret.trim()
          }
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("sb_save_vercel")}
        </button>
      </div>

      <button
        type="button"
        onClick={() => setOpenHelp((v) => !v)}
        className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", openHelp && "rotate-180")} />
        {t("gauth_how")}
      </button>
      {openHelp && (
        <div className="mt-2 space-y-3 rounded-lg bg-white p-3 text-xs leading-relaxed text-muted-foreground">
          <p>{t("gauth_how_body")}</p>
          {authUrls?.supabaseGoogleCallbackUrl && (
            <div>
              <p className="font-semibold text-foreground">{t("gauth_supabase_callback")}</p>
              <code className="mt-1 block break-all rounded bg-surface px-2 py-1 font-mono text-[10px]">
                {authUrls.supabaseGoogleCallbackUrl}
              </code>
            </div>
          )}
          {authUrls?.appCallbackUrl && (
            <div>
              <p className="font-semibold text-foreground">{t("gauth_app_callback")}</p>
              <code className="mt-1 block break-all rounded bg-surface px-2 py-1 font-mono text-[10px]">
                {authUrls.appCallbackUrl}
              </code>
            </div>
          )}
          <p>{t("gauth_supabase_step")}</p>
          <p>{t("sb_how_vercel")}</p>
        </div>
      )}
    </section>
  );
}

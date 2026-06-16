import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { getAuthMe } from "@/lib/api/auth.functions";
import { ensureClientSupabaseConfig } from "@/lib/auth/load-supabase-config";
import { getSupabaseBrowser } from "@/lib/auth/supabase-browser";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/use-auth";

export const Route = createFileRoute("/auth/callback")({
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { refresh } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const configured = await ensureClientSupabaseConfig();
      if (!configured) {
        setError("supabase_not_configured");
        return;
      }

      const supabase = getSupabaseBrowser();
      if (!supabase) {
        setError("supabase_not_configured");
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
        window.location.href,
      );
      if (cancelled) return;
      if (exchangeError) {
        setError(exchangeError.message);
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token ?? null;
      await refresh();

      const me = await getAuthMe({ data: { accessToken: token } });
      if (cancelled) return;

      if (!me.session) {
        const errCode =
          me.sessionError === "missing_service_role"
            ? "missing_service_role"
            : me.sessionError === "missing_anon_key"
              ? "missing_anon_key"
              : "profile_create_failed";
        setError(errCode);
        return;
      }

      if (me.session.profile.accountStatus === "pending") {
        navigate({ to: "/pending" });
      } else {
        navigate({ to: "/" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, refresh]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        {error ? (
          <>
            <p className="text-sm font-semibold text-destructive">{t("auth_callback_error")}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              {error === "missing_service_role"
                ? t("auth_err_missing_service_role")
                : error === "missing_anon_key"
                  ? t("auth_err_missing_anon_key")
                  : error === "supabase_not_configured"
                    ? t("auth_err_client_config")
                    : error}
            </p>
            <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
              {t("auth_callback_error_hint")}
            </p>
          </>
        ) : (
          <>
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t("auth_callback_loading")}</p>
          </>
        )}
      </div>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, Database, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

import {
  connectSupabase,
  getSupabaseStatus,
  testSupabaseCredentials,
} from "@/lib/api/supabase-connect.functions";
import { useI18n } from "@/lib/i18n";
import { useVercelCredentials } from "@/lib/use-vercel-credentials";
import { cn } from "@/lib/utils";

export function SupabaseConnectPanel() {
  const { t } = useI18n();
  const vercel = useVercelCredentials();
  const [url, setUrl] = useState("");
  const [serviceKey, setServiceKey] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [revealKey, setRevealKey] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<{
    configured: boolean;
    canSyncToVercel: boolean;
    vercelProjectId: string | null;
  } | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const s = await getSupabaseStatus({ data: vercel.overrides ?? {} });
      setStatus(s);
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
      invalid_supabase_url: t("sb_err_url"),
      invalid_service_role_key: t("sb_err_key"),
      supabase_unreachable: t("sb_err_unreachable"),
      vercel_not_configured: t("sb_err_vercel"),
      setup_secret_required: t("sb_err_secret"),
      verified: t("sb_test_ok"),
      saved: t("sb_save_ok"),
      saved_and_redeploying: t("sb_save_redeploy"),
    };
    return map[code] ?? code;
  };

  const handleTest = async () => {
    if (!url.trim() || !serviceKey.trim()) return;
    setTesting(true);
    try {
      const res = await testSupabaseCredentials({
        data: { supabaseUrl: url.trim(), serviceRoleKey: serviceKey.trim() },
      });
      if (res.ok) toast.success(messageFor(res.message));
      else toast.error(messageFor(res.message));
    } catch {
      toast.error(t("sb_err_unreachable"));
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!url.trim() || !serviceKey.trim()) return;
    setLoading(true);
    try {
      const res = await connectSupabase({
        data: {
          supabaseUrl: url.trim(),
          serviceRoleKey: serviceKey.trim(),
          setupSecret: setupSecret.trim() || undefined,
          triggerRedeploy: true,
          ...vercel.overrides,
        },
      });
      if (res.ok) {
        toast.success(messageFor(res.message));
        setServiceKey("");
        await refreshStatus();
      } else {
        toast.error(messageFor(res.message));
      }
    } catch {
      toast.error(t("sb_err_unreachable"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            isConnected ? "bg-emerald-50 text-positive" : "bg-white text-primary",
          )}
        >
          {isConnected ? <ShieldCheck className="h-5 w-5" /> : <Database className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-base font-semibold text-foreground sm:text-lg">
            {t("sb_panel_title")}
          </h2>
          <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
            {t("sb_panel_subtitle")}
          </p>
          {status && (
            <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isConnected ? t("sb_connected") : t("sb_disconnected")}
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
            {t("sb_url_label")}
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://xxxx.supabase.co"
            className="mt-1.5 w-full rounded-xl border border-hairline bg-white px-4 py-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
        </div>

        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("sb_key_label")}
          </label>
          <div className="relative mt-1.5">
            <input
              type={revealKey ? "text" : "password"}
              value={serviceKey}
              onChange={(e) => setServiceKey(e.target.value)}
              placeholder={t("sb_key_placeholder")}
              className="w-full rounded-xl border border-hairline bg-white px-4 py-3 pr-11 font-mono text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
            />
            <button
              type="button"
              onClick={() => setRevealKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground hover:text-foreground"
              aria-label="toggle reveal"
            >
              {revealKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
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
          disabled={testing || !url.trim() || !serviceKey.trim()}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-3 text-sm font-semibold text-foreground transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {testing && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("sb_test")}
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading || !canSyncToVercel || !url.trim() || !serviceKey.trim()}
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
        {t("sb_how")}
      </button>
      {openHelp && (
        <div className="mt-2 space-y-2 rounded-lg bg-white p-3 text-xs leading-relaxed text-muted-foreground">
          <p>{t("sb_how_body")}</p>
          <p>{t("sb_how_vercel")}</p>
        </div>
      )}
    </section>
  );
}
